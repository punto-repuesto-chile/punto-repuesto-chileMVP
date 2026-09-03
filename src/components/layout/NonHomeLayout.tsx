import { useEffect, useRef, useState } from "react"
import { Outlet, useLocation } from "react-router-dom"
import { Navbar } from "../../App"

const TOP_SCROLL_THRESHOLD = 24
const DIRECTION_CHANGE_THRESHOLD = 6

export default function NonHomeLayout() {
  const { pathname } = useLocation()
  const [isVisible, setIsVisible] = useState(true)
  const lastScrollY = useRef(0)
  const ticking = useRef(false)

  useEffect(() => {
    setIsVisible(true)
    lastScrollY.current = window.scrollY
  }, [pathname])

  useEffect(() => {
    const updateVisibility = () => {
      const currentScrollY = Math.max(window.scrollY, 0)
      const difference = currentScrollY - lastScrollY.current

      if (currentScrollY <= TOP_SCROLL_THRESHOLD) {
        setIsVisible(true)
      } else if (Math.abs(difference) >= DIRECTION_CHANGE_THRESHOLD) {
        setIsVisible(difference < 0)
      }

      lastScrollY.current = currentScrollY
      ticking.current = false
    }

    const handleScroll = () => {
      if (ticking.current) return
      ticking.current = true
      window.requestAnimationFrame(updateVisibility)
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <div className="min-h-screen pt-16">
      <div
        className={`fixed inset-x-0 top-0 z-50 transform-gpu transition-transform duration-300 ease-out ${
          isVisible ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <Navbar />
      </div>
      <div className="non-home-route">
        <Outlet />
      </div>
    </div>
  )
}
