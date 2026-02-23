import { useEffect, useMemo, useRef, useState } from 'react'

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

export default function CursorPlane() {
  const elRef = useRef(null)

  const seed = useMemo(() => {
    return {
      a: Math.random() * 10,
      b: Math.random() * 10,
      c: Math.random() * 10,
    }
  }, [])

  const stateRef = useRef({
    raf: 0,
    hasPointer: false,
    lastMoveAt: 0,

    everMoved: false,

    lastPointerX: 0,
    lastPointerY: 0,
    lastPointerT: 0,
    cursorVX: 0,
    cursorVY: 0,

    targetX: 0,
    targetY: 0,

    wanderCX: 0,
    wanderCY: 0,

    orbitCX: 0,
    orbitCY: 0,
    orbitR: 120,
    orbitTheta: 0,


    stageLeft: 0,
    stageTop: 0,
    stageW: 0,
    stageH: 0,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,

    t0: 0,
  })

  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    const mediaFine = window.matchMedia?.('(pointer: fine)')
    const mediaReduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')

    const canRun = () => {
      const fineOk = mediaFine ? mediaFine.matches : true
      const reduceOk = mediaReduce ? !mediaReduce.matches : true
      return fineOk && reduceOk
    }

    const updateEnabled = () => setEnabled(canRun())
    updateEnabled()

    mediaFine?.addEventListener?.('change', updateEnabled)
    mediaReduce?.addEventListener?.('change', updateEnabled)

    return () => {
      mediaFine?.removeEventListener?.('change', updateEnabled)
      mediaReduce?.removeEventListener?.('change', updateEnabled)
    }
  }, [])

  useEffect(() => {
    if (!enabled) return

    const s = stateRef.current
    const el = elRef.current
    if (!el) return

    s.t0 = performance.now()

    // Start visible in the top hero area on initial load (center near hero text if available).
    const guessStart = () => {
      const stage = document.querySelector('.introStage')
      const hero = document.querySelector('.introContent')

      const stageRect = stage?.getBoundingClientRect?.() ?? null
      const heroRect = hero?.getBoundingClientRect?.() ?? null

      if (heroRect) {
        return {
          x: heroRect.left + heroRect.width * 0.5,
          y: heroRect.top + heroRect.height * 0.45,
          heroRect,
          stageRect,
        }
      }

      return {
        x: window.innerWidth * 0.5,
        y: window.innerHeight * 0.42,
        heroRect: null,
        stageRect,
      }
    }

    const initial = guessStart()
    const startX = initial.x
    const startY = initial.y
    s.x = startX
    s.y = startY
    s.vx = 0
    s.vy = 0
    s.targetX = startX
    s.targetY = startY
    s.wanderCX = startX
    s.wanderCY = startY
    s.orbitCX = startX
    s.orbitCY = startY
    s.orbitTheta = Math.random() * Math.PI * 2
    s.orbitR = clamp(
      (initial.heroRect ? Math.min(initial.heroRect.width, initial.heroRect.height) * 0.7 : 170) + 80,
      160,
      360
    )

    const sr = initial.stageRect
    s.stageLeft = sr?.left ?? 0
    s.stageTop = sr?.top ?? 0
    s.stageW = sr?.width ?? window.innerWidth
    s.stageH = sr?.height ?? Math.min(window.innerHeight, 720)
    s.hasPointer = true
    s.lastMoveAt = performance.now() - 10_000
    s.lastPointerX = startX
    s.lastPointerY = startY
    s.lastPointerT = performance.now()

    const setInitial = (x, y) => {
      s.targetX = x
      s.targetY = y
      if (!s.hasPointer) {
        s.x = x
        s.y = y
        s.vx = 0
        s.vy = 0
        s.hasPointer = true
      }
    }

    const onMove = (e) => {
      const x = e.clientX
      const y = e.clientY
      const now = performance.now()
      const dt = Math.max(0.001, (now - (s.lastPointerT || now)) / 1000)
      s.cursorVX = (x - s.lastPointerX) / dt
      s.cursorVY = (y - s.lastPointerY) / dt
      s.lastPointerX = x
      s.lastPointerY = y
      s.lastPointerT = now

      s.lastMoveAt = now
      s.everMoved = true
      setInitial(x, y)
    }

    const onResize = () => {
      if (s.everMoved) return
      const next = guessStart()
      s.orbitCX = next.x
      s.orbitCY = next.y

      const sr = next.stageRect
      s.stageLeft = sr?.left ?? 0
      s.stageTop = sr?.top ?? 0
      s.stageW = sr?.width ?? window.innerWidth
      s.stageH = sr?.height ?? Math.min(window.innerHeight, 720)

      s.orbitR = clamp(
        (next.heroRect ? Math.min(next.heroRect.width, next.heroRect.height) * 0.7 : 170) + 80,
        160,
        360
      )
    }

    window.addEventListener('resize', onResize, { passive: true })

    window.addEventListener('pointermove', onMove, { passive: true })

    const tick = (now) => {
      const dt = clamp((now - (s._lastNow ?? now)) / 1000, 0.001, 0.05)
      s._lastNow = now

      if (!s.hasPointer) s.hasPointer = true

      const elapsed = now - s.t0
      const idleMs = now - s.lastMoveAt
      const moving = idleMs < 140

      // Before the first cursor move: orbit around the hero text.
      if (!s.everMoved) {
        // Wider, freer movement across the whole top banner.
        s.orbitTheta += dt * 0.65

        const stagePad = 42
        const left = s.stageLeft + stagePad
        const top = s.stageTop + stagePad
        const right = s.stageLeft + s.stageW - stagePad
        const bottom = s.stageTop + s.stageH - stagePad

        const rx = clamp(s.stageW * 0.42, 220, 560)
        const ry = clamp(s.stageH * 0.22, 140, 340)

        // Lissajous-ish drift + a gentle "circle the title" component
        const lxo =
          Math.sin(s.orbitTheta * 1.0 + seed.a) * rx +
          Math.sin(s.orbitTheta * 1.9 + seed.b) * (rx * 0.18)

        const lyo =
          Math.cos(s.orbitTheta * 1.15 + seed.b) * ry +
          Math.sin(s.orbitTheta * 0.85 + seed.c) * (ry * 0.22)

        const circleR = s.orbitR + Math.sin(elapsed * 0.001 + seed.c) * 18
        const cxo = Math.cos(s.orbitTheta * 0.75) * circleR * 0.35
        const cyo = Math.sin(s.orbitTheta * 0.75) * circleR * 0.25

        const noiseX = Math.sin(elapsed * 0.0018 + seed.a) * 12
        const noiseY = Math.cos(elapsed * 0.0014 + seed.b) * 10

        const rawX = s.orbitCX + lxo + cxo + noiseX
        const rawY = s.orbitCY + lyo + cyo + noiseY

        const desiredX = clamp(rawX, left, right)
        const desiredY = clamp(rawY, top, bottom)

        const stiffness = 10
        const damping = 9
        const ax = (desiredX - s.x) * stiffness - s.vx * damping
        const ay = (desiredY - s.y) * stiffness - s.vy * damping

        s.vx += ax * dt
        s.vy += ay * dt
        s.x += s.vx * dt
        s.y += s.vy * dt

        const angle = Math.atan2(s.vy, s.vx)
        const speed = Math.hypot(s.vx, s.vy)
        const rotate = isFinite(angle) && speed > 4 ? angle : 0

        el.style.transform = `translate3d(${s.x}px, ${s.y}px, 0) rotate(${rotate}rad)`
        el.style.opacity = '0.24'

        s.raf = requestAnimationFrame(tick)
        return
      }

      // When idle, the plane should fly around freely (not converge to cursor).
      // When moving, it follows the cursor but always trails behind it.
      if (!moving && idleMs > 220) {
        // Slowly drift the wander center so it explores nearby space.
        const driftAmp = 18
        const driftX = Math.sin(elapsed * 0.00032 + seed.a) * driftAmp
        const driftY = Math.cos(elapsed * 0.00028 + seed.b) * driftAmp
        s.wanderCX = s.x + driftX
        s.wanderCY = s.y + driftY
      } else if (moving) {
        s.wanderCX = s.targetX
        s.wanderCY = s.targetY
      }

      const speed = Math.hypot(s.vx, s.vy)
      const speedNorm = clamp(speed / 900, 0, 1)

      // Keep a distance from the cursor: always target a point *behind* it.
      const cursorSpeed = Math.hypot(s.cursorVX, s.cursorVY)
      const cursorSpeedNorm = clamp(cursorSpeed / 1200, 0, 1)

      const baseAmp = 12
      const moveAmp = 22
      const amp = moving ? baseAmp + moveAmp * cursorSpeedNorm : 26

      const w1 = 0.0018
      const w2 = 0.0011
      const w3 = 0.00075

      const ox =
        Math.sin(elapsed * w1 + seed.a) * amp +
        Math.sin(elapsed * w2 + seed.b) * (amp * 0.55) +
        Math.sin(elapsed * w3 + seed.c) * (amp * 0.35)

      const oy =
        Math.cos(elapsed * w1 + seed.b) * (amp * 0.85) +
        Math.cos(elapsed * w2 + seed.c) * (amp * 0.55) +
        Math.sin(elapsed * w3 + seed.a) * (amp * 0.25)

      // Trailing offset (prevents plane from reaching the cursor)
      const trailDist = moving ? 58 + 22 * cursorSpeedNorm : 0
      const dirLen = Math.max(1, cursorSpeed)
      const dirX = s.cursorVX / dirLen
      const dirY = s.cursorVY / dirLen

      const followX = s.targetX - dirX * trailDist
      const followY = s.targetY - dirY * trailDist

      const baseX = moving ? followX : s.wanderCX
      const baseY = moving ? followY : s.wanderCY

      const desiredX = baseX + ox
      const desiredY = baseY + oy

      // Springy follow with damping
      // Lower stiffness while moving keeps it lagging behind.
      const stiffness = moving ? 14 : 9
      const damping = moving ? 11 : 9

      const ax = (desiredX - s.x) * stiffness - s.vx * damping
      const ay = (desiredY - s.y) * stiffness - s.vy * damping

      s.vx += ax * dt
      s.vy += ay * dt

      s.x += s.vx * dt
      s.y += s.vy * dt

      // Rotate in direction of travel
      const angle = Math.atan2(s.vy, s.vx)
      const rotate = isFinite(angle) && speed > 4 ? angle : 0

      el.style.transform = `translate3d(${s.x}px, ${s.y}px, 0) rotate(${rotate}rad)`
      el.style.opacity = moving ? '0.26' : '0.22'

      s.raf = requestAnimationFrame(tick)
    }

    s.raf = requestAnimationFrame(tick)

    return () => {
      window.removeEventListener('pointermove', onMove)
      cancelAnimationFrame(s.raf)
    }
  }, [enabled, seed])

  if (!enabled) return null

  return (
    <div className="cursorPlane" ref={elRef} aria-hidden="true">
      <svg className="cursorPlaneSvg" viewBox="0 0 48 48" role="presentation">
        <path
          d="M4 23.5 44 6 28.5 42 22 27 4 23.5Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M22 27 44 6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  )
}

export { CursorPlane }
