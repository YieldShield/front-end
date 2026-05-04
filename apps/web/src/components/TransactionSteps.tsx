export type StepStatus = "pending" | "active" | "done" | "error";

export type TransactionStep = {
  label: string;
  status: StepStatus;
};

type TransactionStepsProps = {
  steps: TransactionStep[];
};

function StepIcon({ status }: { status: StepStatus }) {
  if (status === "active") return <span className="loading loading-spinner loading-xs" />;
  if (status === "done") return <span>&#10003;</span>;
  if (status === "error") return <span>&#10007;</span>;
  return <span className="opacity-40">&#9679;</span>;
}

export function TransactionSteps({ steps }: TransactionStepsProps) {
  return (
    <ul className="space-y-2 text-sm">
      {steps.map((step, index) => (
        <li
          key={index}
          className={`flex items-center gap-2 ${
            step.status === "done"
              ? "text-success"
              : step.status === "error"
                ? "text-error"
                : step.status === "active"
                  ? "text-base-content font-medium"
                  : "text-base-content/40"
          }`}
        >
          <StepIcon status={step.status} />
          {step.label}
        </li>
      ))}
    </ul>
  );
}
