import { Link } from "react-router-dom";
import { docsNavigation } from "./navigation";

export function DocsHome() {
  return (
    <div>
      <h1>YieldShield Documentation</h1>
      <p>
        YieldShield is a decentralized, capital-efficient protection protocol that lets stablecoin savers earn the
        highest available DeFi yields while keeping their principal protected. These pages cover the product, the
        protocol architecture, and step-by-step guides for using shield pools.
      </p>
      <p>
        Pick a section below to start. If you&apos;re new, begin with <Link to="/docs/intro">Introduction</Link>.
      </p>

      {docsNavigation.map(section => (
        <section key={section.title} className="mt-8">
          <h2>{section.title}</h2>
          <ul>
            {section.items.map(item => (
              <li key={item.href}>
                <Link to={item.href}>{item.title}</Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
