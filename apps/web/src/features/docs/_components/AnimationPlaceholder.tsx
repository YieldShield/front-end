type AnimationPlaceholderProps = {
  height?: string;
  className?: string;
};

export function AnimationPlaceholder({ height = "180px", className = "" }: AnimationPlaceholderProps) {
  return (
    <div
      className={`flex items-center justify-center bg-base-200 rounded ${className}`}
      style={{ height, minHeight: height, width: "100%" }}
    >
      <span className="loading loading-spinner loading-md text-secondary" aria-hidden="true" />
    </div>
  );
}
