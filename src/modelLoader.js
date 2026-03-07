// ─── Model Loader ─────────────────────────────────
// Utilitaire pour charger des modeles .obj/.mtl

import { OBJLoader } from 'three/addons/loaders/OBJLoader.js'
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js'

const BASE = import.meta.env.BASE_URL + 'models/'
const cache = new Map()

const objLoader = new OBJLoader()
const mtlLoader = new MTLLoader()

export function loadModel(path) {
  if (cache.has(path)) return cache.get(path).then(m => m.clone())

  const promise = new Promise((resolve, reject) => {
    objLoader.load(
      BASE + path,
      obj => resolve(obj),
      undefined,
      err => reject(new Error(`Failed to load model: ${path} — ${err}`))
    )
  })

  cache.set(path, promise)
  return promise.then(m => m.clone())
}

export function loadModelWithMaterials(objPath, mtlPath) {
  const key = objPath + ':' + mtlPath

  if (cache.has(key)) return cache.get(key).then(m => m.clone())

  const promise = new Promise((resolve, reject) => {
    mtlLoader.setPath(BASE)
    mtlLoader.load(
      mtlPath,
      materials => {
        materials.preload()
        objLoader.setMaterials(materials)
        objLoader.load(
          BASE + objPath,
          obj => resolve(obj),
          undefined,
          err => reject(new Error(`Failed to load model: ${objPath} — ${err}`))
        )
      },
      undefined,
      err => reject(new Error(`Failed to load materials: ${mtlPath} — ${err}`))
    )
  })

  cache.set(key, promise)
  return promise.then(m => m.clone())
}
