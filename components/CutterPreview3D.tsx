'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

/**
 * クッキー型の3Dプレビュー。
 *
 * ここでは STL を作らない。見た目を出すだけ。
 * ファイルはお支払い後にサーバー側で作る（lib/cookie-cutter/server.ts）。
 */
export default function CutterPreview3D({
  positions,
  className = '',
}: {
  /** 三角形1枚につき9個の座標。lib/cookie-cutter/mesh.ts の Mesh.positions */
  positions: number[] | null
  className?: string
}) {
  const mountRef = useRef<HTMLDivElement>(null)
  // 毎フレーム作り直さないよう、three の一式は ref に持つ
  const sceneRef = useRef<{
    renderer: THREE.WebGLRenderer
    scene: THREE.Scene
    camera: THREE.PerspectiveCamera
    controls: OrbitControls
    mesh: THREE.Mesh | null
    frameId: number
  } | null>(null)

  // 初期化と後片付け
  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xf5f3ff)

    const camera = new THREE.PerspectiveCamera(40, 1, 1, 2000)
    camera.position.set(90, -110, 90)
    camera.up.set(0, 0, 1) // z を上にする（型の高さ方向）

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.domElement.style.display = 'block'
    mount.appendChild(renderer.domElement)

    scene.add(new THREE.AmbientLight(0xffffff, 1.6))
    const key = new THREE.DirectionalLight(0xffffff, 2.2)
    key.position.set(60, -80, 120)
    scene.add(key)
    const fill = new THREE.DirectionalLight(0xffffff, 0.8)
    fill.position.set(-80, 60, 40)
    scene.add(fill)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.enablePan = false

    const state = { renderer, scene, camera, controls, mesh: null as THREE.Mesh | null, frameId: 0 }
    sceneRef.current = state

    const resize = () => {
      const width = mount.clientWidth
      const height = mount.clientHeight
      if (width === 0 || height === 0) return
      // ⚠ 第3引数を false にしないこと。canvas の CSS サイズが更新されず、
      //   描画面だけが devicePixelRatio 倍に広がって枠からはみ出す
      renderer.setSize(width, height)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(mount)

    const animate = () => {
      state.frameId = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(state.frameId)
      observer.disconnect()
      controls.dispose()
      state.mesh?.geometry.dispose()
      ;(state.mesh?.material as THREE.Material | undefined)?.dispose()
      renderer.dispose()
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement)
      sceneRef.current = null
    }
  }, [])

  // 形が変わったら差し替える
  useEffect(() => {
    const state = sceneRef.current
    if (!state) return

    if (state.mesh) {
      state.scene.remove(state.mesh)
      state.mesh.geometry.dispose()
      ;(state.mesh.material as THREE.Material).dispose()
      state.mesh = null
    }
    if (!positions || positions.length === 0) return

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.computeVertexNormals()
    geometry.computeBoundingSphere()

    const material = new THREE.MeshStandardMaterial({
      color: 0xa855f7,
      metalness: 0.05,
      roughness: 0.55,
      side: THREE.DoubleSide,
    })
    const mesh = new THREE.Mesh(geometry, material)
    state.scene.add(mesh)
    state.mesh = mesh

    // 型の大きさに関係なく画面に収まる距離を計算する。
    // 画角の狭いほう（横長の画面では縦）を基準にしないと、端がはみ出す
    const sphere = geometry.boundingSphere
    const radius = sphere?.radius ?? 50
    const center = sphere?.center ?? new THREE.Vector3(0, 0, 7)

    const verticalFov = (state.camera.fov * Math.PI) / 180
    const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * state.camera.aspect)
    const narrowestFov = Math.min(verticalFov, horizontalFov)
    // 1.15 は余白。ぴったりだと回したときに角が画面外に出る
    const distance = (radius / Math.sin(narrowestFov / 2)) * 1.15

    // 斜め上から見下ろす向き
    const direction = new THREE.Vector3(0.55, -0.7, 0.45).normalize()
    state.controls.target.copy(center)
    state.camera.position.copy(center).addScaledVector(direction, distance)
    state.camera.near = Math.max(0.1, distance - radius * 4)
    state.camera.far = distance + radius * 8
    state.camera.updateProjectionMatrix()
    state.controls.update()
  }, [positions])

  return <div ref={mountRef} className={className} aria-label="クッキー型の3Dプレビュー" />
}
