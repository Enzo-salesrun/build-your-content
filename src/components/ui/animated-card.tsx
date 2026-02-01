import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export const AnimatedCard = ({
  className,
  children,
  gradient = "from-violet-500 to-purple-500",
}: {
  className?: string;
  children: React.ReactNode;
  gradient?: string;
}) => {
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -5 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900",
        className
      )}
    >
      <div
        className={cn(
          "absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-10",
          `bg-gradient-to-br ${gradient}`
        )}
      />
      {children}
    </motion.div>
  );
};

export const GlowCard = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => {
  return (
    <div className={cn("group relative", className)}>
      <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-pink-600 to-purple-600 opacity-0 blur transition duration-500 group-hover:opacity-75" />
      <motion.div
        whileHover={{ scale: 1.01 }}
        className="relative rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-950"
      >
        {children}
      </motion.div>
    </div>
  );
};

export const GradientCard = ({
  className,
  children,
  variant = "purple",
}: {
  className?: string;
  children: React.ReactNode;
  variant?: "purple" | "blue" | "green" | "orange";
}) => {
  const gradients = {
    purple: "from-violet-500/10 via-purple-500/10 to-fuchsia-500/10",
    blue: "from-blue-500/10 via-cyan-500/10 to-teal-500/10",
    green: "from-green-500/10 via-emerald-500/10 to-teal-500/10",
    orange: "from-orange-500/10 via-amber-500/10 to-yellow-500/10",
  };

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-neutral-200/50 p-6 backdrop-blur-sm",
        `bg-gradient-to-br ${gradients[variant]}`,
        className
      )}
    >
      {children}
    </motion.div>
  );
};
