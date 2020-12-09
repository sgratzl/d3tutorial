const margin = { top: 40, bottom: 10, left: 120, right: 20 };
const width = 800 - margin.left - margin.right;
const height = 600 - margin.top - margin.bottom;

// Creates sources <svg> element
const svg = d3
  .select("body")
  .append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom);

// Group used to enforce margin
const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
g.append("g").attr("class", "x axis");
g.append("g").attr("class", "y axis");

// declare the data element type for proper typing
interface IElem {
  temperature: number;
  location: {
    country: string;
    city: string;
  };
}

// Global variable for all data
let data: IElem[];

// Scales setup
const xscale = d3.scaleLinear().range([0, width]);
const yscale = d3.scaleBand().rangeRound([0, height]).paddingInner(0.1);

// Axis setup
const xaxis = d3.axisTop(xscale);
const yaxis = d3.axisLeft(yscale);

/////////////////////////

d3.json<IElem[]>("weather.json").then((json?: IElem[]) => {
  if (!json) {
    return;
  }
  data = json;

  update(data);
});

function update(new_data: IElem[]) {
  //update the scales
  // need to use the ! to tell TypeScript that it will always return a number
  xscale.domain([0, d3.max(new_data, (d) => d.temperature)!]);
  yscale.domain(new_data.map((d) => d.location.city));
  //render the axis
  // specify the generic argument to enforce being a SVGGElement
  g.select<SVGGElement>(".x.axis").transition().call(xaxis);
  g.select<SVGGElement>(".y.axis").transition().call(yaxis);

  // Render the chart with new data

  // DATA JOIN use the key argument for ensuring that the same DOM element is bound to the same data-item
  const rect = g
    .selectAll("rect")
    .data(new_data, (d) => (d as IElem).location.city) // key argument cannot be properly typed
    .join(
      // ENTER
      // new elements
      (enter) => {
        const rect_enter = enter.append("rect").attr("x", 0);
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
    .attr("height", yscale.bandwidth())
    .attr("width", (d) => xscale(d.temperature)!)
    .attr("y", (d) => yscale(d.location.city)!);

  rect.select("title").text((d) => d.location.city);
}

// interactivity
d3.select<HTMLInputElement, unknown>("#filter-us-only").on("change", function () {
  // This will be triggered when the user selects or unselects the checkbox
  // since we typed the select such that this is a HTMLInputElement we can just use the this context and have proper autocompletion
  const checked = this.checked;
  if (checked) {
    // Checkbox was just checked

    // Keep only data element whose country is US
    const filtered_data = data.filter((d) => d.location.country === "US");

    update(filtered_data); // Update the chart with the filtered data
  } else {
    // Checkbox was just unchecked
    update(data); // Update the chart with all the data we have
  }
});
