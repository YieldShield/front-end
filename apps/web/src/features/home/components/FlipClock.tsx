import { useEffect, useRef, useState } from "react";

interface FlipCardProps {
  value: number;
  label: string;
}

function FlipCard({ value, label }: FlipCardProps) {
  const [current, setCurrent] = useState(value);
  const [previous, setPrevious] = useState(value);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value === current) {
      return;
    }

    setPrevious(current);
    setCurrent(value);

    if (cardRef.current) {
      cardRef.current.classList.remove("flip");
      void cardRef.current.offsetWidth;
      cardRef.current.classList.add("flip");
    }

    const timer = setTimeout(() => {
      if (cardRef.current) {
        cardRef.current.classList.remove("flip");
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [current, value]);

  const formatValue = (nextValue: number) => (nextValue < 10 ? `0${nextValue}` : `${nextValue}`);

  return (
    <div className="flip-clock__piece">
      <div ref={cardRef} className="flip-card">
        <b className="flip-card__top">{formatValue(current)}</b>
        <b className="flip-card__bottom" data-value={formatValue(current)}></b>
        <b className="flip-card__back" data-value={formatValue(previous)}></b>
        <b className="flip-card__back-bottom" data-value={formatValue(previous)}></b>
      </div>
      <span className="flip-clock__slot">{label}</span>
      <style>{`
        .flip-clock__piece {
          display: inline-block;
          margin: 0 5px;
        }

        .flip-clock__slot {
          font-size: 0.9rem;
          line-height: 1.5;
          display: block;
          margin-top: 0.5rem;
          color: var(--ys-text-muted);
          font-weight: 500;
        }

        .flip-card {
          display: block;
          position: relative;
          padding-bottom: 0.72em;
          font-size: 2.5rem;
          line-height: 0.95;
        }

        .flip-card__top {
          display: block;
          height: 0.72em;
          color: #fff;
          background: #8a0a7a;
          padding: 0.23em 0.25em 0.4em;
          border-radius: 0.15em 0.15em 0 0;
          backface-visibility: hidden;
          transform-style: preserve-3d;
          width: 1.8em;
        }

        .flip-card__bottom,
        .flip-card__back-bottom,
        .flip-card__back::before,
        .flip-card__back::after {
          display: block;
          height: 0.72em;
          color: #fff;
          background: var(--color-secondary);
          padding: 0.23em 0.25em 0.4em;
          border-radius: 0.15em 0.15em 0 0;
          backface-visibility: hidden;
          transform-style: preserve-3d;
          width: 1.8em;
        }

        .flip-card__bottom,
        .flip-card__back-bottom {
          color: #fff;
          position: absolute;
          top: 50%;
          left: 0;
          border-top: solid 1px rgba(0, 0, 0, 0.3);
          background: var(--color-secondary);
          border-radius: 0 0 0.15em 0.15em;
          pointer-events: none;
          overflow: hidden;
          z-index: 2;
        }

        .flip-card__back-bottom {
          z-index: 1;
        }

        .flip-card__bottom::after,
        .flip-card__back-bottom::after {
          display: block;
          margin-top: -0.72em;
        }

        .flip-card__back {
          position: absolute;
          top: 0;
          height: 100%;
          left: 0%;
          pointer-events: none;
        }

        .flip-card__back::before,
        .flip-card__bottom::after,
        .flip-card__back-bottom::after {
          content: attr(data-value);
        }

        .flip-card__back::before {
          position: relative;
          overflow: hidden;
          z-index: -1;
        }

        .flip .flip-card__back::before {
          z-index: 1;
          animation: flipTop 0.3s cubic-bezier(0.37, 0.01, 0.94, 0.35);
          animation-fill-mode: both;
          transform-origin: center bottom;
        }

        .flip .flip-card__bottom {
          transform-origin: center top;
          animation-fill-mode: both;
          animation: flipBottom 0.6s cubic-bezier(0.15, 0.45, 0.28, 1);
        }

        @keyframes flipTop {
          0% {
            transform: rotateX(0deg);
            z-index: 2;
          }
          0%,
          99% {
            opacity: 1;
          }
          100% {
            transform: rotateX(-90deg);
            opacity: 0;
          }
        }

        @keyframes flipBottom {
          0%,
          50% {
            z-index: -1;
            transform: rotateX(90deg);
            opacity: 0;
          }
          51% {
            opacity: 1;
          }
          100% {
            opacity: 1;
            transform: rotateX(0deg);
            z-index: 5;
          }
        }
      `}</style>
    </div>
  );
}

export function FlipClock() {
  const [time, setTime] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();

      setTime({
        hours: now.getHours() % 12 || 12,
        minutes: now.getMinutes(),
        seconds: now.getSeconds(),
      });
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flip-clock">
      <FlipCard value={time.hours} label="Hours" />
      <FlipCard value={time.minutes} label="Minutes" />
      <FlipCard value={time.seconds} label="Seconds" />
      <style>{`
        .flip-clock {
          text-align: center;
          perspective: 600px;
          margin: 0 auto;
        }
      `}</style>
    </div>
  );
}
