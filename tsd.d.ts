/// <reference types="d3" />

// d3 v6 typing patch
declare namespace d3 {
    export function bin(): d3.HistogramGeneratorNumber<number, number>;
    export function bin<Datum, Value extends number | undefined>(): d3.HistogramGeneratorNumber<Datum, Value>;
    export function bin<Datum, Value extends Date | undefined>(): d3.HistogramGeneratorDate<Datum, Value>;
}