type TokenPairMarkProps = {
  shieldedSymbol: string;
  backingSymbol: string;
};

function getInitials(symbol: string) {
  return symbol.slice(0, 2).toUpperCase();
}

export function TokenPairMark({ shieldedSymbol, backingSymbol }: TokenPairMarkProps) {
  return (
    <div className="legacy-token-pair" aria-label={`${shieldedSymbol} and ${backingSymbol}`}>
      <span className="legacy-token-pair-badge">{getInitials(shieldedSymbol)}</span>
      <span className="legacy-token-pair-badge">{getInitials(backingSymbol)}</span>
    </div>
  );
}
