import { motion, useReducedMotion } from "framer-motion"
import { CheckCircle2, ShieldCheck } from "lucide-react"

export default function LoginLoadingScene({ phase = "building" }) {
  const reducedMotion = useReducedMotion()
  const isSuccess = phase === "success"

  return (
    <motion.div
      className="login-loading-scene compact"
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.98 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      role="status"
      aria-live="polite"
    >
      <div className="login-loading-aurora aurora-left" />
      <div className="login-loading-aurora aurora-right" />
      <div className="login-loading-grid" />
      <span className="login-loading-kicker">Securing Access</span>

      <div className={`login-scene-stage compact ${isSuccess ? "success" : ""}`}>
        <div className="scene-soft-ring" />
        <motion.div
          className="scene-orbit orbit-left"
          animate={reducedMotion ? {} : { y: [-6, 6, -6], opacity: [0.35, 0.8, 0.35] }}
          transition={{ duration: 3.1, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="scene-orbit orbit-right"
          animate={reducedMotion ? {} : { y: [5, -7, 5], opacity: [0.25, 0.75, 0.25] }}
          transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
        />

        <motion.div
          className="compact-assembly"
          animate={
            isSuccess || reducedMotion
              ? { scale: 1 }
              : { scale: [0.98, 1.02, 0.98] }
          }
          transition={{ duration: 1.6, repeat: isSuccess ? 0 : Infinity, ease: "easeInOut" }}
        >
          <div className="assembly-track" />

          <motion.div
            className="assembly-connector left"
            animate={
              isSuccess || reducedMotion
                ? { opacity: 1, scaleX: 1 }
                : { opacity: [0.45, 1, 0.55], scaleX: [0.88, 1, 0.92] }
            }
            transition={{ duration: 1.25, repeat: isSuccess ? 0 : Infinity, ease: "easeInOut" }}
          />

          <motion.div
            className="compact-rail"
            animate={
              isSuccess || reducedMotion
                ? { opacity: 1, scaleX: 1 }
                : { opacity: [0.45, 1, 0.45], scaleX: [0.92, 1, 0.92] }
            }
            transition={{ duration: 1.3, repeat: isSuccess ? 0 : Infinity, ease: "easeInOut" }}
          />

          <motion.div
            className="assembly-node node-left"
            animate={
              isSuccess || reducedMotion
                ? { opacity: 1, scale: 1 }
                : { opacity: [0.35, 0.95, 0.35], scale: [0.95, 1.08, 0.95] }
            }
            transition={{ duration: 1.5, repeat: isSuccess ? 0 : Infinity, ease: "easeInOut" }}
          />

          <motion.div
            className="compact-block left"
            animate={
              isSuccess
                ? { y: 0, opacity: 1, x: 0 }
                : reducedMotion
                  ? {}
                  : { x: [-7, 0, -7], y: [2, -1, 2] }
            }
            transition={{ duration: 1.4, repeat: isSuccess ? 0 : Infinity, ease: "easeInOut" }}
          />

          <motion.div
            className="assembly-gear large"
            animate={
              isSuccess || reducedMotion
                ? { rotate: 0, opacity: 1 }
                : { rotate: 360 }
            }
            transition={{ duration: 5.4, repeat: isSuccess ? 0 : Infinity, ease: "linear" }}
          >
            <span className="gear-core" />
          </motion.div>

          <motion.div
            className="assembly-module"
            animate={
              isSuccess || reducedMotion
                ? { opacity: 1, y: 0 }
                : { opacity: [0.72, 1, 0.72], y: [1, -3, 1] }
            }
            transition={{ duration: 1.75, repeat: isSuccess ? 0 : Infinity, ease: "easeInOut" }}
          >
            <span className="module-line top" />
            <span className="module-line mid" />
            <span className="module-line bottom" />
          </motion.div>

          <motion.div
            className="compact-core"
            animate={
              isSuccess
                ? { boxShadow: "0 0 0 12px rgba(101, 185, 140, 0.16)" }
                : reducedMotion
                  ? {}
                  : { boxShadow: ["0 10px 24px rgba(35, 48, 68, 0.12)", "0 14px 30px rgba(35, 48, 68, 0.18)", "0 10px 24px rgba(35, 48, 68, 0.12)"] }
            }
            transition={{ duration: 1.6, repeat: isSuccess ? 0 : Infinity, ease: "easeInOut" }}
          >
            {isSuccess ? <CheckCircle2 size={28} /> : <ShieldCheck size={26} />}
          </motion.div>

          <motion.div
            className="assembly-gear small"
            animate={
              isSuccess || reducedMotion
                ? { rotate: 0, opacity: 1 }
                : { rotate: -360 }
            }
            transition={{ duration: 4.6, repeat: isSuccess ? 0 : Infinity, ease: "linear" }}
          >
            <span className="gear-core" />
          </motion.div>

          <motion.div
            className="assembly-node node-right"
            animate={
              isSuccess || reducedMotion
                ? { opacity: 1, scale: 1 }
                : { opacity: [0.35, 0.95, 0.35], scale: [0.95, 1.08, 0.95] }
            }
            transition={{ duration: 1.5, repeat: isSuccess ? 0 : Infinity, ease: "easeInOut", delay: 0.18 }}
          />

          <motion.div
            className="compact-block right"
            animate={
              isSuccess
                ? { y: 0, opacity: 1, x: 0 }
                : reducedMotion
                  ? {}
                  : { x: [7, 0, 7], y: [-1, 2, -1] }
            }
            transition={{ duration: 1.4, repeat: isSuccess ? 0 : Infinity, ease: "easeInOut", delay: 0.12 }}
          />

          <motion.div
            className="assembly-connector right"
            animate={
              isSuccess || reducedMotion
                ? { opacity: 1, scaleX: 1 }
                : { opacity: [0.55, 1, 0.45], scaleX: [0.92, 1, 0.88] }
            }
            transition={{ duration: 1.25, repeat: isSuccess ? 0 : Infinity, ease: "easeInOut", delay: 0.08 }}
          />
        </motion.div>
      </div>

      <h2>{isSuccess ? "Workspace ready" : "Signing you in"}</h2>
      <p>
        {isSuccess ? "Access confirmed." : "Assembling your Flowvera workspace."}
      </p>
    </motion.div>
  )
}
