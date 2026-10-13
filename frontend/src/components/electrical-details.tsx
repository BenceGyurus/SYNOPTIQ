"use client";

import { ArrowRight, Cpu, Sun, Zap } from "lucide-react";
import {
  electricalSummary,
  formatNumber as n,
  type Lang,
} from "@/lib/dashboard";

type Reading = Parameters<typeof electricalSummary>[0];

export function ElectricalDetails({
  reading,
  lang,
  online,
}: {
  reading: Reading;
  lang: Lang;
  online: boolean;
}) {
  const hu = lang === "hu";
  const { strings, dc, ratio, phases, spread } = electricalSummary(reading);
  return (
    <section className="surface electrical-surface">
      <div className="section-heading">
        <div>
          <p className="eyebrow">
            {hu ? "A NAPFÉNY ÚTJA" : "FROM SUNLIGHT TO AC"}
          </p>
          <h2>{hu ? "A rendszer belülről" : "Inside your system"}</h2>
        </div>
        <span className="chip">
          {online
            ? hu
              ? "Friss mérés"
              : "Recent reading"
            : hu
              ? "Utolsó ismert mérés"
              : "Last known reading"}
        </span>
      </div>
      <div
        className={`energy-flow ${online && (reading?.pac ?? 0) > 10 ? "generating" : ""}`}
      >
        <div className="flow-node">
          <span className="flow-symbol">
            <Sun size={25} />
          </span>
          <span>{hu ? "Napelem · DC" : "Solar array · DC"}</span>
          <strong>
            {n(dc, 0, lang)} <small>W</small>
          </strong>
        </div>
        <span className="flow-connector" aria-hidden="true">
          <ArrowRight size={22} />
        </span>
        <div className="flow-node inverter-node">
          <span className="flow-symbol">
            <Cpu size={25} />
          </span>
          <span>Inverter</span>
          <strong>
            {n(reading?.tmp, 1, lang)} <small>°C</small>
          </strong>
        </div>
        <span className="flow-connector" aria-hidden="true">
          <ArrowRight size={22} />
        </span>
        <div className="flow-node">
          <span className="flow-symbol">
            <Zap size={25} />
          </span>
          <span>{hu ? "AC kimenet" : "AC output"}</span>
          <strong>
            {n(reading?.pac, 0, lang)} <small>W</small>
          </strong>
        </div>
      </div>
      <div className="electrical-columns">
        <div>
          <h3>
            {hu ? "PV bemenetek" : "PV inputs"} <span>{strings.length}</span>
          </h3>
          {strings.length ? (
            strings.map((pv) => (
              <div className="pv-input" key={pv.index}>
                <div>
                  <span className="pv-label">PV{pv.index}</span>
                  <span>
                    {n(pv.voltage, 1, lang)} V <i>·</i> {n(pv.current, 2, lang)}{" "}
                    A
                  </span>
                  <strong>{n(pv.power, 0, lang)} W</strong>
                </div>
                <div className="pv-track">
                  <span
                    style={{ width: `${dc ? (pv.power / dc) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))
          ) : (
            <p className="insight-note">
              {hu
                ? "Nincs aktív PV feszültségadat."
                : "No active PV voltage data."}
            </p>
          )}
          <p className="insight-note">
            {hu
              ? "Számított DC teljesítmény: feszültség × áram. Az ágak eltérő mérete és tájolása is okozhat különbséget."
              : "Calculated DC power: voltage × current. String size and orientation can explain differences."}
          </p>
        </div>
        <div>
          <h3>{hu ? "Hálózati fázisok" : "Grid phases"}</h3>
          <div className="phase-table">
            <div className="phase-row phase-head">
              <span>{hu ? "Fázis" : "Phase"}</span>
              <span>{hu ? "Feszültség" : "Voltage"}</span>
              <span>{hu ? "Áram" : "Current"}</span>
            </div>
            {phases.map((phase) => (
              <div className="phase-row" key={phase.index}>
                <span>
                  <i className={`phase-dot phase-${phase.index}`} />L
                  {phase.index}
                </span>
                <strong>{n(phase.voltage, 1, lang)} V</strong>
                <strong>{n(phase.current, 1, lang)} A</strong>
              </div>
            ))}
          </div>
          <p className="insight-note">
            {hu
              ? "Fázisfeszültségek közti különbség"
              : "Difference between phase voltages"}
            : <b>{n(spread, 1, lang)} V</b>
          </p>
        </div>
      </div>
      <div className="electrical-footer">
        <div>
          <span>{hu ? "Számított AC/DC arány" : "Calculated AC/DC ratio"}</span>
          <strong>
            {n(ratio, 1, lang)}
            {ratio == null ? "" : "%"}
          </strong>
        </div>
        <div>
          <span>{hu ? "Frekvencia" : "Frequency"}</span>
          <strong>{n(reading?.fac, 2, lang)} Hz</strong>
        </div>
        <div>
          <span>
            {hu ? "Jelentett teljesítménytényező" : "Reported power factor"}
          </span>
          <strong>{n(reading?.pf, 2, lang)}</strong>
        </div>
        <div>
          <span>{hu ? "Összes üzemóra" : "Lifetime operating hours"}</span>
          <strong>{n(reading?.hto, 0, lang)} h</strong>
        </div>
      </div>
      {ratio == null && (
        <p className="insight-note ratio-note">
          {hu
            ? "Az AC/DC arány csak legalább 100 W DC bemenetnél, egymással összhangban lévő mérésekből jelenik meg."
            : "The AC/DC ratio is shown only above 100 W DC input and when input and output readings are consistent."}
        </p>
      )}
    </section>
  );
}
