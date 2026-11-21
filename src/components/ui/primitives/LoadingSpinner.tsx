import clsx from "clsx";
import { LoaderCircle } from "lucide-react";

type LoadingSpinnerProps = {
	className?: string;
};

export function LoadingSpinner({ className }: LoadingSpinnerProps) {
	return (
		<LoaderCircle
			aria-hidden="true"
			className={clsx("size-4 animate-spin", className)}
		/>
	);
}
