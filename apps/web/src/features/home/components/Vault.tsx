export function Vault() {
  return (
    <div className="vault-container">
      <style>{`
        .vault-container {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
        }

        .vault {
          position: relative;
          width: 140px;
          height: 140px;
          padding: 16px;
          box-shadow:
            inset 0 0 0 2px rgba(217, 27, 200, 0.5),
            0 0 20px rgba(217, 27, 200, 0.3);
          border-radius: 10%;
          background: linear-gradient(135deg, rgba(217, 27, 200, 0.2) 0%, rgba(177, 12, 161, 0.2) 100%);
        }

        .vault__door {
          display: flex;
          position: relative;
          z-index: 1;
          height: 100%;
          box-shadow: inset 0 0 0 2px rgba(217, 27, 200, 0.5);
          border-radius: 6%;
          background: linear-gradient(135deg, rgba(217, 27, 200, 0.25) 0%, rgba(177, 12, 161, 0.25) 100%);
        }

        .vault__door::before,
        .vault__door::after {
          content: "";
          display: block;
          position: absolute;
          left: 0;
          width: 7.5%;
          height: 16%;
          transform: translateX(-35%);
          box-shadow: inset 0 0 0 2px rgba(217, 27, 200, 0.5);
          border-radius: 50% 50% 50% 50% / 22% 22% 22% 22%;
          background: linear-gradient(135deg, rgba(217, 27, 200, 0.5) 0%, rgba(177, 12, 161, 0.5) 100%);
        }

        .vault__door::before {
          top: 18%;
        }

        .vault__door::after {
          bottom: 18%;
        }

        .vault__door__handle {
          width: 6px;
          height: 70px;
          margin: auto 8% auto auto;
          border-radius: 50% 50% 50% 50% / 5% 5% 5% 5%;
          box-shadow: inset 0 0 0 2px rgba(217, 27, 200, 0.5);
          background: linear-gradient(135deg, rgba(217, 27, 200, 0.6) 0%, rgba(177, 12, 161, 0.6) 100%);
        }

        .vault__feet {
          display: flex;
          position: relative;
          z-index: 1;
          top: calc(16px - 2px);
          flex-flow: row nowrap;
          justify-content: space-between;
          padding: 0 10px;
        }

        .vault__feet__foot {
          width: 30px;
          height: 10px;
          box-shadow: inset 0 0 0 2px rgba(217, 27, 200, 0.5);
          border-radius: 0 0 45% 10% / 0 0 100% 10%;
          background: linear-gradient(135deg, rgba(217, 27, 200, 0.4) 0%, rgba(177, 12, 161, 0.4) 100%);
        }

        .vault__feet__foot + .vault__feet__foot {
          transform: scaleX(-1);
        }

        .vault__shadow {
          position: absolute;
          z-index: 0;
          bottom: 0;
          left: 50%;
          width: 105%;
          height: 20px;
          transform: translate(-50%, 86%);
          border-radius: 50%;
          background-color: rgba(217, 27, 200, 0.2);
        }

        .vault-crank {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 56px;
          height: 56px;
          margin: auto;
          padding: 5%;
          transform: translate(-50%, -50%);
          border-radius: 50%;
          box-shadow: inset 0 0 0 2px rgba(217, 27, 200, 0.5);
          animation: rotate 3s linear infinite;
        }

        @keyframes rotate {
          from {
            transform: translate(-50%, -50%) rotate(0deg);
          }
          to {
            transform: translate(-50%, -50%) rotate(360deg);
          }
        }

        .vault-crank__inner {
          position: relative;
          width: 100%;
          height: 100%;
          padding: 25%;
          border-radius: 50%;
          background: linear-gradient(135deg, rgba(217, 27, 200, 0.5) 0%, rgba(177, 12, 161, 0.5) 100%);
        }

        .vault-crank__inner__circle {
          position: relative;
          z-index: 1;
          width: 100%;
          height: 100%;
          border: 3px solid rgba(217, 27, 200, 0.5);
          border-radius: 50%;
          background: linear-gradient(135deg, rgba(217, 27, 200, 0.3) 0%, rgba(177, 12, 161, 0.3) 100%);
        }

        .vault-crank__inner__circle::before {
          content: "";
          position: absolute;
          top: 50%;
          left: 50%;
          width: 50%;
          height: 50%;
          border-radius: 50%;
          transform: translate(-50%, -50%);
          background: linear-gradient(135deg, rgba(217, 27, 200, 0.6) 0%, rgba(177, 12, 161, 0.6) 100%);
        }

        .vault-crank__inner__handle {
          --transform: translate(-50%, -50%);
          position: absolute;
          z-index: 0;
          top: 50%;
          left: 50%;
          width: 8%;
          height: 80%;
          transform: var(--transform);
          border-radius: 50% 50% 50% 50% / 5% 5% 5% 5%;
          background-color: rgba(217, 27, 200, 0.6);
        }

        .vault-crank__inner__handle:nth-of-type(2) {
          transform: var(--transform) rotate(45deg);
        }

        .vault-crank__inner__handle:nth-of-type(3) {
          transform: var(--transform) rotate(-45deg);
        }

        .vault-crank__inner__handle:nth-of-type(4) {
          transform: var(--transform) rotate(90deg);
        }
      `}</style>
      <div className="vault">
        <div className="vault__door">
          <div className="vault-crank">
            <div className="vault-crank__inner">
              <div className="vault-crank__inner__circle"></div>
              <div className="vault-crank__inner__handle"></div>
              <div className="vault-crank__inner__handle"></div>
              <div className="vault-crank__inner__handle"></div>
              <div className="vault-crank__inner__handle"></div>
            </div>
          </div>
          <div className="vault__door__handle"></div>
        </div>
        <div className="vault__feet">
          <div className="vault__feet__foot"></div>
          <div className="vault__feet__foot"></div>
        </div>
        <div className="vault__shadow"></div>
      </div>
    </div>
  );
}
