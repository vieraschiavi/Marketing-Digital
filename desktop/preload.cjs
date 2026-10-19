// © 2026 Martín Viera. Todos los derechos reservados.
// Puente mínimo renderer ↔ proceso principal. Solo expone funciones
// concretas; nunca ipcRenderer entero ni nada de Node.
const { contextBridge, ipcRenderer } = require("electron");

const invocar = (canal) => (...args) => ipcRenderer.invoke("mvmd:" + canal, ...args);

contextBridge.exposeInMainWorld("mvmd", {
  leer: invocar("leer"),
  guardar: invocar("guardar"),
  iaEstado: invocar("iaEstado"),
  iaGuardarClave: invocar("iaGuardarClave"),
  iaBorrarClave: invocar("iaBorrarClave"),
  iaActualizarModelos: invocar("iaActualizarModelos"),
  iaElegirModelo: invocar("iaElegirModelo"),
  iaPreguntar: invocar("iaPreguntar"),
  guardarArchivo: invocar("guardarArchivo"),
  version: invocar("version"),
  abrirExterno: invocar("abrirExterno"),
});
