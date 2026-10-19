// © 2026 Martín Viera. Todos los derechos reservados.
//
// Proceso principal de MV Marketing Digital (Electron).
//   • Ventana con contextIsolation + sandbox, sin Node en el renderer.
//   • Persistencia en userData/mvmd.json (estado de la app).
//   • Claves de IA cifradas con safeStorage (DPAPI en Windows). Si el sistema
//     no ofrece cifrado, la clave vive solo en memoria durante la sesión.
//   • Actualización de modelos: al guardar una clave y cada 7 días al iniciar.

const { app, BrowserWindow, ipcMain, safeStorage, dialog, shell, Menu } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const { pathToFileURL } = require("node:url");
const { cliente } = require("./ia-main.cjs");

const RENDERER = path.join(__dirname, "renderer");
const ARCHIVO = () => path.join(app.getPath("userData"), "mvmd.json");
const CLAVES_PERMITIDAS = new Set(["estado", "iaActivo"]);
const clavesEnMemoria = new Map();
let ventana = null;
let ia = null; // core/ia.js (ESM), se carga una vez

function leerStore() {
  try {
    return JSON.parse(fs.readFileSync(ARCHIVO(), "utf8"));
  } catch {
    return {};
  }
}

function escribirStore(store) {
  const destino = ARCHIVO();
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  // Escritura atómica: un corte de luz a mitad no deja el archivo corrupto.
  fs.writeFileSync(destino + ".tmp", JSON.stringify(store));
  fs.renameSync(destino + ".tmp", destino);
}

async function cargarIa() {
  if (!ia) ia = await import(pathToFileURL(path.join(RENDERER, "core", "ia.js")).href);
  return ia;
}

function proveedorValido(id) {
  if (!ia?.PROVEEDORES?.[id]) throw new Error(`Proveedor desconocido: ${id}`);
  return ia.PROVEEDORES[id];
}

function obtenerClave(id) {
  if (clavesEnMemoria.has(id)) return clavesEnMemoria.get(id);
  const cifrada = leerStore().ia?.[id]?.clave;
  if (!cifrada || !safeStorage.isEncryptionAvailable()) return null;
  try {
    return safeStorage.decryptString(Buffer.from(cifrada, "base64"));
  } catch {
    return null;
  }
}

function datosProveedor(id) {
  return leerStore().ia?.[id] || {};
}

function guardarProveedor(id, cambios) {
  const store = leerStore();
  store.ia = store.ia || {};
  store.ia[id] = { ...(store.ia[id] || {}), ...cambios };
  escribirStore(store);
}

async function actualizarModelos(id, forzar = false) {
  await cargarIa();
  const def = proveedorValido(id);
  const previo = datosProveedor(id);
  if (!forzar && !ia.debeRefrescar(previo)) return { recomendado: previo.modelo, lista: previo.modelos || def.respaldo, origen: previo.origen };
  const clave = obtenerClave(id);
  if (!clave && !def.local) throw new Error("No hay clave guardada para este proveedor.");
  const modelos = await cliente(id, def, clave).listar();
  const r = ia.elegirModelo(id, modelos);
  // Si el usuario eligió un modelo a mano y sigue existiendo, se respeta.
  const modelo = previo.elegidoManual && r.lista.includes(previo.modelo) ? previo.modelo : r.recomendado;
  guardarProveedor(id, { modelos: r.lista, modelo, actualizado: new Date().toISOString(), origen: r.origen });
  return { ...r, recomendado: modelo };
}

function crearVentana() {
  ventana = new BrowserWindow({
    width: 1440, height: 920, minWidth: 980, minHeight: 640,
    backgroundColor: "#081527",
    title: "MV Marketing Digital",
    icon: path.join(__dirname, "build", "icon.png"),
    show: false,
    webPreferences: { preload: path.join(__dirname, "preload.cjs"), contextIsolation: true, sandbox: true, nodeIntegration: false, spellcheck: true },
  });
  ventana.setMenuBarVisibility(false);
  ventana.once("ready-to-show", () => ventana.show());
  ventana.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });
  ventana.webContents.on("will-navigate", (e, url) => {
    if (!url.startsWith("file://")) e.preventDefault();
  });
  ventana.loadFile(path.join(RENDERER, "app", "index.html"));
}

// ── IPC ──────────────────────────────────────────────────────────────────

ipcMain.handle("mvmd:leer", (_e, clave) => {
  if (!CLAVES_PERMITIDAS.has(clave)) return null;
  return leerStore()[clave] ?? null;
});

ipcMain.handle("mvmd:guardar", (_e, clave, valor) => {
  if (!CLAVES_PERMITIDAS.has(clave)) throw new Error("Clave de almacenamiento no permitida");
  const store = leerStore();
  store[clave] = valor;
  escribirStore(store);
  return true;
});

ipcMain.handle("mvmd:iaEstado", async () => {
  await cargarIa();
  const store = leerStore();
  const proveedores = {};
  for (const [id, def] of Object.entries(ia.PROVEEDORES)) {
    const d = store.ia?.[id] || {};
    proveedores[id] = {
      tieneClave: def.local ? !!d.habilitado : !!obtenerClave(id),
      modelo: d.modelo || def.modeloBase,
      modelos: d.modelos || def.respaldo,
      actualizado: d.actualizado || null,
      origen: d.origen || null,
    };
  }
  return { disponible: true, cifrado: safeStorage.isEncryptionAvailable(), activo: store.iaActivo || null, proveedores };
});

ipcMain.handle("mvmd:iaGuardarClave", async (_e, id, clave) => {
  await cargarIa();
  proveedorValido(id);
  if (typeof clave !== "string" || clave.trim().length < 10 || clave.length > 500) throw new Error("Clave inválida");
  clave = clave.trim();
  if (safeStorage.isEncryptionAvailable()) {
    guardarProveedor(id, { clave: safeStorage.encryptString(clave).toString("base64") });
    clavesEnMemoria.delete(id);
  } else {
    clavesEnMemoria.set(id, clave); // sin cifrado del sistema: no se escribe a disco
  }
  const store = leerStore();
  if (!store.iaActivo) {
    store.iaActivo = id;
    escribirStore(store);
  }
  return true;
});

ipcMain.handle("mvmd:iaBorrarClave", async (_e, id) => {
  await cargarIa();
  proveedorValido(id);
  clavesEnMemoria.delete(id);
  const store = leerStore();
  if (store.ia?.[id]) delete store.ia[id].clave;
  if (ia.PROVEEDORES[id].local && store.ia?.[id]) store.ia[id].habilitado = false;
  if (store.iaActivo === id) store.iaActivo = null;
  escribirStore(store);
  return true;
});

ipcMain.handle("mvmd:iaActualizarModelos", async (_e, id, forzar) => {
  await cargarIa();
  const r = await actualizarModelos(id, !!forzar);
  if (ia.PROVEEDORES[id].local) guardarProveedor(id, { habilitado: true });
  return r;
});

ipcMain.handle("mvmd:iaElegirModelo", async (_e, id, modelo) => {
  await cargarIa();
  proveedorValido(id);
  if (typeof modelo !== "string" || modelo.length > 200) throw new Error("Modelo inválido");
  guardarProveedor(id, { modelo, elegidoManual: true });
  return true;
});

ipcMain.handle("mvmd:iaPreguntar", async (_e, payload) => {
  await cargarIa();
  const { proveedor, idioma, historial, pregunta, contexto } = payload || {};
  const def = proveedorValido(proveedor);
  if (typeof pregunta !== "string" || !pregunta.trim() || pregunta.length > 8000) throw new Error("Pregunta inválida");
  const clave = obtenerClave(proveedor);
  if (!clave && !def.local) throw new Error("No hay clave configurada");
  const modelo = datosProveedor(proveedor).modelo || def.modeloBase;
  return cliente(proveedor, def, clave).preguntar({
    modelo,
    system: ia.systemPrompt(idioma),
    mensajes: ia.armarMensajes(Array.isArray(historial) ? historial : [], pregunta, contexto || {}),
  });
});

ipcMain.handle("mvmd:guardarArchivo", async (_e, nombre, contenido) => {
  const { canceled, filePath } = await dialog.showSaveDialog(ventana, { defaultPath: path.basename(String(nombre)) });
  if (canceled || !filePath) return false;
  fs.writeFileSync(filePath, String(contenido), "utf8");
  return true;
});

ipcMain.handle("mvmd:version", () => app.getVersion());

ipcMain.handle("mvmd:abrirExterno", (_e, url) => {
  if (typeof url === "string" && /^https:\/\//.test(url)) return shell.openExternal(url);
  return false;
});

// ── Ciclo de vida ────────────────────────────────────────────────────────

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (ventana) {
      if (ventana.isMinimized()) ventana.restore();
      ventana.focus();
    }
  });
  app.whenReady().then(async () => {
    Menu.setApplicationMenu(null);
    crearVentana();
    // Refresco silencioso de modelos (cada 7 días por proveedor con clave).
    try {
      await cargarIa();
      for (const id of Object.keys(ia.PROVEEDORES)) {
        if (obtenerClave(id) && ia.debeRefrescar(datosProveedor(id))) await actualizarModelos(id).catch(() => {});
      }
    } catch (e) {
      console.error("No se pudo refrescar la lista de modelos:", e.message);
    }
  });
  app.on("window-all-closed", () => app.quit());
}
