import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

export interface InputProps extends React.ComponentProps<"input"> {
  /** Optional label for accessibility - if provided, renders a visible label */
  label?: string;
  /** If true, hides the label visually but keeps it for screen readers */
  srOnlyLabel?: boolean;
  /** Error message to display */
  error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, srOnlyLabel, error, id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const errorId = error ? `${inputId}-error` : undefined;

    const input = (
      <input
        type={type}
        id={inputId}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          error && "border-destructive focus-visible:ring-destructive",
          className,
        )}
        ref={ref}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={errorId}
        {...props}
      />
    );

    if (!label) {
      return (
        <div className="w-full">
          {input}
          {error && (
            <p id={errorId} className="text-sm text-destructive mt-1" role="alert">
              {error}
            </p>
          )}
        </div>
      );
    }

    return (
      <div className="w-full space-y-1">
        <Label
          htmlFor={inputId}
          className={cn(srOnlyLabel && "sr-only")}
        >
          {label}
        </Label>
        {input}
        {error && (
          <p id={errorId} className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  },
);
Input.displayName = "Input";

export { Input };
