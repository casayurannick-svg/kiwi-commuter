# Changelog

All notable changes to the Kiwi Commuter Cost & Arbitrage Dashboard will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
- **BUG-77**: Isolated `CommuteMatrix` from IRD calculation mode leakage by explicitly setting `calculationMode: 'FUEL'` and `calcMode: 'FUEL'` in `iceArbitrage` and `evArbitrage` useMemo blocks, ensuring itemized fuel and electricity values render accurately when IRD True Cost mode is toggled.
- **BUG-76**: Cleaned up `CommuteMatrix` UI and layout:
  - Removed internal `FEAT-75` badge from matrix header.
  - Dynamically calculated ICE RUC (displaying calculated RUC for diesel vehicles, only showing `(Exempt)` when RUC is $0).
  - Dynamically displayed custom fuel price (`Custom fuel price ($X.XX/L)`) in the Column 1 footer when customized.
  - Moved `MonthlySavingsChart` under `FuelRadarWidget` in the left sidebar column (`lg:col-span-5`) in `DashboardClient`.

### Added
- **FEAT-75**: 3-Way Commute Summary Matrix UI component comparing Combustion (ICE), Electric (EV), and Public Transit side-by-side across daily, weekly, and annual intervals.
- **FEAT-73 & FEAT-74**: Engine math for EV/PHEV energy consumption and statutory NZ RUC tiers ($0.076/km for BEV/Diesel, $0.038/km for PHEV).
- **FEAT-72**: Bi-directional URL synchronization and form state for EV charging source, kWh rate, and battery efficiency.
