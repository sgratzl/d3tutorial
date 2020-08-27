/// <reference types="d3" />
/// <reference path="../tsd.d.ts" />

declare type Sex = "female" | "male";
declare type Survival = "0" | "1";

interface IPerson {
  age: number;
  fare: number;
  pclass: string;
  survived: Survival;
  sex: Sex;
}

interface IPersonGroup {
  key: string;
  values: IPerson[];
}

interface IState {
  data: IPerson[];
  passengerClass: string;
  selectedSex: null | Sex;
  selectedSurvived: null | Survival;
}

declare type SimpleArcDatum = {
  startAngle: number;
  endAngle: number;
  padAngle: number;
};

const state: IState = {
  data: [],
  passengerClass: "",
  selectedSex: null,
  selectedSurvived: null,
};

function createHistogram(svgSelector: string) {
  const margin = {
    top: 40,
    bottom: 10,
    left: 120,
    right: 20,
  };
  const width = 600 - margin.left - margin.right;
  const height = 400 - margin.top - margin.bottom;

  // Creates sources <svg> element
  const svg = d3
    .select(svgSelector)
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

  // Group used to enforce margin
  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  // Scales setup
  const xscale = d3.scaleLinear().range([0, width]);
  const yscale = d3.scaleLinear().range([0, height]);

  // Axis setup
  const xaxis = d3.axisTop(xscale);
  const g_xaxis = g.append("g").attr("class", "x axis");
  const yaxis = d3.axisLeft(yscale);
  const g_yaxis = g.append("g").attr("class", "y axis");

  function update(new_data: d3.Bin<IPerson, number>[]) {
    //update the scales
    xscale.domain([0, d3.max(new_data, (d) => d.length)!]);
    yscale.domain([new_data[0].x0!, new_data[new_data.length - 1].x1!]);
    //render the axis
    g_xaxis.transition().call(xaxis);
    g_yaxis.transition().call(yaxis);

    // Render the chart with new data

    // DATA JOIN
    const rect = g
      .selectAll("rect")
      .data(new_data)
      .join(
        (enter) => {
          // ENTER
          // new elements
          const rect_enter = enter
            .append("rect")
            .attr("x", 0) //set intelligent default values for animation
            .attr("y", 0)
            .attr("width", 0)
            .attr("height", 0);
          rect_enter.append("title");
          return rect_enter;
        },
        // UPDATE
        // update existing elements
        (update) => update,
        // EXIT
        // elements that aren't associated with data
        (exit) => exit.remove()
      );

    // ENTER + UPDATE
    // both old and new elements
    rect
      .transition()
      .attr("height", (d) => yscale(d.x1!) - yscale(d.x0!) - 2)
      .attr("width", (d) => xscale(d.length))
      .attr("y", (d) => yscale(d.x0!) + 1);

    rect.select("title").text((d) => `${d.x0}: ${d.length}`);
  }

  return update;
}

function createPieChart(
  svgSelector: string,
  stateAttr: "selectedSex" | "selectedSurvived",
  colorScheme: ReadonlyArray<string>
) {
  const margin = 10;
  const radius = 100;

  // Creates sources <svg> element
  const svg = d3
    .select(svgSelector)
    .attr("width", radius * 2 + margin * 2)
    .attr("height", radius * 2 + margin * 2);

  // Group used to enforce margin
  const g = svg.append("g").attr("transform", `translate(${radius + margin},${radius + margin})`);

  const pie = d3
    .pie<IPersonGroup>()
    .value((d) => d.values.length)
    .sortValues(null)
    .sort(null);
  const arc = d3.arc<SimpleArcDatum>().outerRadius(radius).innerRadius(0);

  const noSlice: SimpleArcDatum[] = [
    { startAngle: 0, endAngle: Math.PI * 2, padAngle: 0 },
    { startAngle: 0, endAngle: 0, padAngle: 0 },
  ];

  const cscale = d3.scaleOrdinal(colorScheme);

  function update(new_data: IPersonGroup[]) {
    const pied = pie(new_data);
    // Render the chart with new data

    cscale.domain(new_data.map((d) => d.key));

    // DATA JOIN
    const old = g.selectAll<SVGPathElement, d3.PieArcDatum<IPersonGroup>>("path").data();

    function tweenArc(d: d3.PieArcDatum<IPersonGroup>, i: number) {
      const interpolate = d3.interpolateObject(old[i], d);
      return (t: number) => arc(interpolate(t))!;
    }

    // DATA JOIN
    const path = g
      .selectAll("path")
      .data(pied, (d) => (d as d3.PieArcDatum<IPersonGroup>).data.key)
      .join(
        // ENTER
        // new elements
        (enter) => {
          const path_enter = enter
            .append("path")
            .attr("d", (_d, i) => arc(noSlice[i]))
            .on("click", (_e, d) => {
              // note: because of missing D3 v6 typings
              if (state[stateAttr] === ((d as unknown) as d3.PieArcDatum<IPersonGroup>).data.key) {
                state[stateAttr] = null;
              } else {
                state[stateAttr] = ((d as unknown) as d3.PieArcDatum<IPersonGroup>).data.key as any;
              }
              updateApp();
            });
          path_enter.append("title");
          return path_enter;
        },
        (update) => update,
        (exit) => exit.transition().attrTween("d", tweenArc).remove()
      );

    // ENTER + UPDATE
    // both old and new elements
    path
      .classed("selected", (d) => d.data.key === state.selectedSex)
      .transition()
      .attrTween("d", tweenArc)
      .style("fill", (d) => cscale(d.data.key));

    path.select("title").text((d) => `${d.data.key}: ${d.data.values.length}`);
  }
  return update;
}

/////////////////////////

const ageHistogram = createHistogram("#age");
const sexPieChart = createPieChart("#sex", "selectedSex", d3.schemeSet3);
const fareHistogram = createHistogram("#fare");
const survivedPieChart = createPieChart("#survived", "selectedSurvived", d3.schemeSet3.slice(2));

function filterData() {
  return state.data.filter((d) => {
    if (state.passengerClass && d.pclass !== state.passengerClass) {
      return false;
    }
    if (state.selectedSex && d.sex !== state.selectedSex) {
      return false;
    }
    if (state.selectedSurvived && d.survived !== state.selectedSurvived) {
      return false;
    }
    return true;
  });
}

function wrangleData(filtered: IPerson[]) {
  const ageHistogram = d3
    .bin<IPerson, number>()
    .domain([0, 100])
    .thresholds(10)
    .value((d) => d.age);

  const ageHistogramData = ageHistogram(filtered);

  // always the two categories
  const sexPieData = (["female", "male"] as Sex[]).map((key) => ({
    key,
    values: filtered.filter((d) => d.sex === key),
  }));

  const fareHistogram = d3
    .bin<IPerson, number>()
    .domain([0, d3.max(filtered, (d) => d.fare)!])
    .value((d) => d.fare);

  const fareHistogramData = fareHistogram(filtered);

  // always the two categories
  const survivedPieData = (["0", "1"] as Survival[]).map((key) => ({
    key,
    values: filtered.filter((d) => d.survived === key),
  }));

  return {
    ageHistogramData,
    sexPieData,
    fareHistogramData,
    survivedPieData,
  };
}

function updateApp() {
  const filtered = filterData();

  const { ageHistogramData, sexPieData, fareHistogramData, survivedPieData } = wrangleData(filtered);
  ageHistogram(ageHistogramData);
  sexPieChart(sexPieData);
  fareHistogram(fareHistogramData);
  survivedPieChart(survivedPieData);

  d3.select("#selectedSex").text(state.selectedSex || "None");
  d3.select("#selectedSurvived").text(state.selectedSurvived || "None");
}

d3.csv<keyof IPerson>("titanic3.csv").then((parsed) => {
  state.data = parsed.map((row) => ({
    pclass: row.pclass!,
    sex: row.sex as Sex,
    survived: row.survived as Survival,
    age: Number.parseInt(row.age!, 10),
    fare: Number.parseFloat(row.fare!),
  }));

  updateApp();
});

//interactivity
d3.select<HTMLInputElement, unknown>("#passenger-class").on("change", function () {
  const selected = this.value;
  state.passengerClass = selected;
  updateApp();
});
