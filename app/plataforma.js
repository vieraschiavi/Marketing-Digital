// © 2026 Martín Viera. Todos los derechos reservados.
//
// Puente con la plataforma. En el .exe, `window.mvmd` lo expone el preload de
// Electron (IPC al proceso principal: guardado en disco, claves cifradas con
// safeStorage y llamadas a la IA sin pasar la clave por el renderer). En la
// demo web no existe: se guarda en localStorage y la IA externa no se ofrece —
// una página pública no es lugar para pegar una API key.

const esElectron = typeof window !== "undefined" && !!window.mvmd;

function leerLocal(clave, defecto) {
  try {
    const v = localStorage.getItem("mvmd:" + clave);
    return v ? JSON.parse(v) : defecto;
  } catch {
    return defecto;
  }
}
function guardarLocal(clave, valor) {
  try {
    localStorage.setItem("mvmd:" + clave, JSON.stringify(valor));
  } catch {
    // modo privado / cuota llena: la app sigue, solo que sin persistir
  }
}

export const plataforma = {
  esElectron,
  async leer(clave, defecto = null) {
    if (esElectron) return (await window.mvmd.leer(clave)) ?? defecto;
    return leerLocal(clave, defecto);
  },
  async guardar(clave, valor) {
    if (esElectron) return window.mvmd.guardar(clave, valor);
    guardarLocal(clave, valor);
    return true;
  },
  /** Estado de la IA: qué proveedores tienen clave (nunca devuelve la clave). */
  async iaEstado() {
    if (!esElectron) return { disponible: false, proveedores: {}, motivo: "web" };
    return window.mvmd.iaEstado();
  },
  async iaGuardarClave(proveedor, clave) {
    if (!esElectron) throw new Error("La IA externa solo está disponible en la app de escritorio.");
    return window.mvmd.iaGuardarClave(proveedor, clave);
  },
  async iaBorrarClave(proveedor) {
    if (!esElectron) return false;
    return window.mvmd.iaBorrarClave(proveedor);
  },
  async iaActualizarModelos(proveedor, forzar = false) {
    if (!esElectron) throw new Error("web");
    return window.mvmd.iaActualizarModelos(proveedor, forzar);
  },
  async iaElegirModelo(proveedor, modelo) {
    if (!esElectron) return false;
    return window.mvmd.iaElegirModelo(proveedor, modelo);
  },
  async iaPreguntar(payload) {
    if (!esElectron) throw new Error("web");
    return window.mvmd.iaPreguntar(payload);
  },
  async guardarArchivo(nombre, contenido, tipo = "text/plain") {
    if (esElectron) return window.mvmd.guardarArchivo(nombre, contenido);
    const blob = new Blob([contenido], { type: tipo + ";charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 500);
    return true;
  },
  async version() {
    return esElectron ? window.mvmd.version() : "web";
  },
  abrirExterno(url) {
    if (esElectron) return window.mvmd.abrirExterno(url);
    window.open(url, "_blank", "noopener");
  },
};
