import { useEffect, useState } from "react";

const protectionTypes = [
  { title: "Smart Contract Vulnerabilities" },
  { title: "Protocol Failures" },
  { title: "Depegging" },
  { title: "Any Value-Reducing Event", highlight: true },
];

const styles = `
  .protection-animation-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    min-height: 120px;
    padding: 1.5rem 0;
  }

  .contract-wrapper {
    position: relative;
    width: 100%;
    max-width: 400px;
    perspective: 1000px;
  }

  .contract {
    position: relative;
    width: 100%;
    background: linear-gradient(135deg, rgba(117, 24, 167, 0.05) 0%, rgba(177, 12, 161, 0.05) 100%);
    border: 2px solid var(--color-secondary);
    border-radius: 12px;
    padding: 1rem 1.25rem;
    box-shadow:
      0 4px 6px rgba(117, 24, 167, 0.1),
      inset 0 0 0 1px rgba(117, 24, 167, 0.2);
    animation: contractPulse 3s ease-in-out infinite;
  }

  @keyframes contractPulse {
    0%, 100% {
      box-shadow: 0 4px 6px rgba(117, 24, 167, 0.1), inset 0 0 0 1px rgba(117, 24, 167, 0.2);
    }
    50% {
      box-shadow: 0 8px 12px rgba(117, 24, 167, 0.2), inset 0 0 0 2px rgba(117, 24, 167, 0.3);
    }
  }

  .contract-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 2px solid var(--color-secondary);
  }

  .contract-title {
    font-size: 1rem;
    font-weight: 700;
    color: var(--color-secondary);
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .protection-item {
    display: flex;
    align-items: center;
    gap: 0.875rem;
    opacity: 0;
    transform: translateY(10px);
    animation: fadeInUp 0.5s ease-out forwards;
  }

  @keyframes fadeInUp {
    to { opacity: 1; transform: translateY(0); }
  }

  .checkbox {
    position: relative;
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    border: 2px solid var(--color-secondary);
    border-radius: 4px;
    background: linear-gradient(135deg, rgba(117, 24, 167, 0.1) 0%, rgba(177, 12, 161, 0.1) 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    animation: checkPulse 2s ease-in-out infinite;
  }

  @keyframes checkPulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(117, 24, 167, 0.4); }
    50% { box-shadow: 0 0 0 4px rgba(117, 24, 167, 0); }
  }

  .checkbox::after {
    content: "";
    position: absolute;
    top: 50%;
    left: 50%;
    width: 6px;
    height: 10px;
    border: 2px solid var(--color-secondary);
    border-top: none;
    border-left: none;
    transform: translate(-50%, -60%) rotate(45deg) scale(1);
    opacity: 1;
  }

  .item-content { flex: 1; }

  .protection-title {
    font-size: 0.9375rem;
    font-weight: 700;
    color: var(--color-secondary);
    line-height: 1.4;
  }

  .protection-title.highlight {
    color: var(--color-primary);
    font-size: 1rem;
    animation: highlightPulse 1.5s ease-in-out infinite;
  }

  @keyframes highlightPulse {
    0%, 100% { transform: scale(1); text-shadow: 0 0 0 rgba(117, 24, 167, 0); }
    50% { transform: scale(1.02); text-shadow: 0 0 8px rgba(117, 24, 167, 0.3); }
  }
`;

export function ContractAnimation() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const duration = protectionTypes[currentIndex].highlight ? 4000 : 2000;
    const timer = setTimeout(() => {
      setCurrentIndex(prev => (prev + 1) % protectionTypes.length);
    }, duration);
    return () => clearTimeout(timer);
  }, [currentIndex]);

  return (
    <div className="protection-animation-container">
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <div className="contract-wrapper">
        <div className="contract">
          <div className="contract-header">
            <div className="contract-title">Protection Coverage</div>
          </div>
          <div className="protection-item">
            <div className="checkbox" />
            <div className="item-content">
              <div
                className={`protection-title ${protectionTypes[currentIndex].highlight ? "highlight" : ""}`}
              >
                {protectionTypes[currentIndex].title}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
