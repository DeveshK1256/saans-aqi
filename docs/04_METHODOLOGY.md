# Saans (सांस) — Scientific Methodology & Calculation Specifications

> **Core Axiom:** The LLM explains, code calculates. Every exposure, dose, sub-index, and emission value in Saans is calculated by deterministic, peer-reviewed physical equations implemented in `src/domain/`.

---

## 1. National Air Quality Index (NAQI) Formula (India CPCB)

NAQI is computed using the official 2014 Ministry of Environment, Forest & Climate Change (MoEFCC) standard:

$$I_p = \frac{I_{hi} - I_{lo}}{BP_{hi} - BP_{lo}} \times (C_p - BP_{lo}) + I_{lo}$$

- **Overall NAQI:** $NAQI = \max(I_{pm2.5}, I_{pm10}, I_{no2}, I_{so2}, I_{co}, I_{o3})$
- **CPCB Validity Criterion:** At least 3 criteria pollutants must be monitored, with at least one particulate ($PM_{2.5}$ or $PM_{10}$); otherwise flagged as `partial`.

---

## 2. Indoor Single-Zone Mass Balance Differential Model

Indoor residential air is modeled using mass balance mechanics (Nazaroff, 2004; US EPA Indoor Air Quality Modeling):

$$\frac{dC_{in}}{dt} = P \cdot a \cdot C_{out} + \frac{S}{V} - \left(a + k + \frac{Q_p}{V}\right) C_{in}$$

### Analytical Solution:
$$\lambda = a + k + \frac{Q_p}{V} \quad (\text{Total hourly removal rate})$$

$$C_{ss} = \frac{P \cdot a \cdot C_{out} + \frac{S}{V}}{\lambda} \quad (\text{Steady-state concentration})$$

$$C_{in}(t + \Delta t) = C_{ss} + (C_{in}(t) - C_{ss}) \cdot e^{-\lambda \Delta t}$$

Where:
- $a$: Air exchange rate ($h^{-1}$)
- $P$: Particle penetration factor through building envelope
- $k$: Natural gravitational and electrostatic deposition rate ($h^{-1}$)
- $Q_p$: Effective clean air delivery rate (CADR in $m^3/h$)
- $V$: Room air volume ($m^3$)
- $S$: Indoor emission source rate ($\mu g/h$)
- $C_{out}$: Ambient outdoor concentration ($\mu g/m^3$)

---

## 3. 24-Hour Personal Inhaled Dose Model

Daily inhaled particulate mass is integrated across microenvironments and activity patterns (US EPA Exposure Factors Handbook 2011, Chapter 6):

$$Dose_m = \sum_{s} C_{e,s} \times IR(m, a_s) \times \Delta t_s \quad (\mu g/\text{day})$$

$$\text{Exposure Ratio} = \frac{Dose_m}{Dose_{ref}}$$

Where:
- $Dose_{ref} = \sum_{s} 15.0 \, \mu g/m^3 \times IR(m, a_s) \times \Delta t_s$ (WHO 2021 24-hour health guideline reference).
- $IR(m, a)$: Inhalation rate ($m^3/h$) indexed by age group and metabolic activity level.

---

## 4. Parameter Registry & Authoritative Citations

| Parameter | Unit | Low | Central | High | Source / Citation | Status |
|---|---|---|---|---|---|---|
| Inhalation Rate (Adult, Sedentary) | $m^3/h$ | 0.35 | 0.50 | 0.68 | US EPA Exposure Factors Handbook (2011), Table 6-1 | Verified |
| Inhalation Rate (Adult, Light Activity) | $m^3/h$ | 0.80 | 1.15 | 1.50 | US EPA Exposure Factors Handbook (2011), Table 6-1 | Verified |
| Inhalation Rate (Child 6yo, Sedentary) | $m^3/h$ | 0.30 | 0.40 | 0.55 | US EPA Exposure Factors Handbook (2011), Table 6-1 | Verified |
| Inhalation Rate (Child 6yo, Light Activity) | $m^3/h$ | 0.55 | 0.72 | 0.95 | US EPA Exposure Factors Handbook (2011), Table 6-1 | Verified |
| Envelope Penetration Factor ($P$) | unitless | 0.65 | 0.80 | 0.95 | Nazaroff, W. W. (2004). Indoor particle dynamics | Verified |
| Particle Deposition Rate ($k$) | $h^{-1}$ | 0.10 | 0.25 | 0.45 | Thatcher & Layton (1995); Howard-Reed et al. (2003) | Verified |
| Air Exchange (Closed Windows) | $h^{-1}$ | 0.30 | 0.60 | 1.10 | CPCB / MoEFCC Indian urban residential baseline | Verified |
| Air Exchange (Open Windows) | $h^{-1}$ | 2.50 | 4.80 | 8.00 | Wallace et al. (2002) cross-ventilation measurements | Verified |
| LPG Cooking Source Rate (with Chimney) | $\mu g/h$ | 250 | 550 | 950 | See & Balasubramanian (2011); 70-80% exhaust capture | Verified |
| LPG Cooking Source Rate (No Chimney) | $\mu g/h$ | 1200 | 2400 | 4500 | Huboyo et al. (2014) Indian domestic cooking emissions | Verified |
| Motorcycle Tailpipe Commute Ratio | ratio | 1.00 | 1.20 | 1.55 | Goel & Kumar (2015) Commute characterisation in Delhi | Verified |
| Metro / AC Train Commute Ratio | ratio | 0.25 | 0.38 | 0.52 | Apte et al. (2011) High-resolution mobile mapping | Verified |
| Motorcycle CO2 Emission Factor | $g/km$ | 55 | 72 | 90 | ARAI (Automotive Research Association of India) | Verified |
| Metro CO2 Emission Factor | $g/km$ | 10 | 16 | 24 | CPCB (2020) Comprehensive Emission Inventory | Verified |
| Cigarette Equivalence Threshold | $\mu g/m^3$ | 22.0 | 22.0 | 22.0 | Muller & Muller (2015), Berkeley Earth Communication Model | Verified |

---

## 5. Scientific Caveat on Relatable Units ("Cigarette Equivalents")

The cigarette equivalent conversion ($\text{Daily PM}_{2.5} / 22 \, \mu g/m^3$) is an epidemiological rule-of-thumb introduced by Berkeley Earth to translate abstract ambient micrograms into a relatable public health hazard scale. 

**Medical Limitation:** It is not a clinical diagnosis. Ambient PM2.5 and tobacco smoke have differing chemical profiles (e.g. tobacco contains nicotine, specific nitrosamines, and volatile hydrocarbons; ambient PM contains crustal dust, sulfates, nitrates, and elemental carbon). Saans displays cigarette equivalence strictly behind a user toggle with this explicit disclaimer.
