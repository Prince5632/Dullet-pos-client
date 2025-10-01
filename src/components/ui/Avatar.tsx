import React from "react";
import { cn, getInitials, getAvatarColor } from "../../utils";
import { resolveCapturedImageSrc } from "../../utils/image";

interface AvatarProps {
  src?: string;
  name: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = "md",
  className,
}) => {
  const sizeClasses = {
    xs: "h-6 w-6 text-xs",
    sm: "h-8 w-8 text-sm",
    md: "h-10 w-10 text-base",
    lg: "h-12 w-12 text-lg",
    xl: "h-16 w-16 text-xl",
  };

  const baseClasses =
    "inline-flex items-center justify-center rounded-full font-medium";

  const resolvedSrc = resolveCapturedImageSrc(src);

  if (resolvedSrc) {
    return (
      <img
        src={resolvedSrc}
        alt={name}
        className={cn(
          baseClasses,
          sizeClasses[size],
          "object-cover",
          className
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        baseClasses,
        sizeClasses[size],
        getAvatarColor(name),
        "text-white",
        className
      )}
    >
      {getInitials(name)}
    </div>
  );
};

export default Avatar;
