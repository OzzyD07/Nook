/** Reference documents. They are shown to the AI and must always validate (see tests). */
export const EXAMPLES = {
  newsCard: `root = CardContainer([header, stories])
header = Row([Icon("news", "sm", "accent"), Heading("Tech today", "sm")], "sm", "center")
stories = List([s1, s2, s3])
s1 = ListItem("Chipmaker unveils 2 nm process", "Reuters", "08:10")
s2 = ListItem("EU finalizes AI liability rules", "Financial Times", "07:45")
s3 = ListItem("Open model tops coding benchmark", "The Verge", "06:30")`,

  newsDetail: `root = Page([summary, top, sources])
summary = Callout("Three stories dominated tech news this morning.", "Summary", "info")
top = Section("Top stories", [story1, story2])
story1 = Stack([Heading("Chipmaker unveils 2 nm process", "md"), Caption("Reuters · 08:10"), Text("The new node promises 15% better efficiency and enters volume production next year."), Link("Read on Reuters", "https://www.reuters.com/technology/")], "xs")
story2 = Stack([Heading("EU finalizes AI liability rules", "md"), Caption("Financial Times · 07:45"), Text("Providers of high-risk systems will carry the burden of proof in damage claims.")], "xs")
sources = SourceList([Source("Reuters Technology", "https://www.reuters.com/technology/", "Reuters")])`,

  metricCard: `root = CardContainer([body])
body = Stack([Caption("BTC / USD"), Metric("Bitcoin", "$64,210", "+2.1%", "up"), Sparkline([61200, 62050, 61800, 63100, 64210], "positive")], "xs")`,

  metricDetail: `root = Page([price, chart, facts])
price = Row([Metric("Price", "$64,210", "+2.1%", "up", false, "lg"), Metric("24h volume", "$28.4B")], "md")
chart = Section("Last 5 days", [LineChart(["Mon", "Tue", "Wed", "Thu", "Fri"], [{name: "BTC", values: [61200, 62050, 61800, 63100, 64210]}], null, "USD")])
facts = KeyValue([{label: "Market cap", value: "$1.26T"}, {label: "All-time high", value: "$73,750"}])`,

  quoteCard: `root = CardContainer([body], "accent")
body = Stack([Icon("quote", "md", "accent"), Text("Stay hungry, stay foolish.", "lg", null, "medium"), Caption("Steve Jobs")], "sm")`,

  groceryDetail: `root = Page([list, extra, actions])
list = Checklist("groceries", [milk, eggs, bread, apples], "This week")
milk = ChecklistItem("milk", "Milk", "2 liters")
eggs = ChecklistItem("eggs", "Eggs")
bread = ChecklistItem("bread", "Whole-grain bread")
apples = ChecklistItem("apples", "Apples", null, true)
extra = TextInput("requests", "Anything else to add?", "e.g. coffee beans", true)
actions = Row([Button("Update the list", "request_refresh"), Button("Ask my AI", "ask_ai", "Suggest three dinners using what is on my grocery list.")], "sm")`,

  weekCard: `root = CardContainer([body])
body = Stack([Heading("This week", "sm"), WeekStrip([CalendarEvent("2026-09-24", "Dentist", "09:30", "warning"), CalendarEvent("2026-09-26", "Concert", "20:00", "accent")]), Countdown("2026-09-26T20:00:00+03:00", "Concert", "compact")], "sm")`,

  calendarDetail: `root = Page([tabs])
tabs = Tabs([monthTab, agendaTab])
monthTab = Tab("Month", [Calendar("2026-09", [dentist, concert, trip], "September")])
agendaTab = Tab("Agenda", [Countdown("2026-10-02T08:00:00+03:00", "Trip starts in", "large"), Agenda([dentist, concert, trip]), feedback])
dentist = CalendarEvent("2026-09-24", "Dentist", "09:30", "warning")
concert = CalendarEvent("2026-09-26", "Concert", "20:00", "accent", "https://example.com/tickets")
trip = CalendarEvent("2026-10-02", "Trip to Izmir", "All day", "positive")
feedback = Rating("week-rating", "How was this week?")`,

  weatherCard: `root = CardContainer([top, temp, Caption("Sunny · H 27° L 19°")], null, null, "sunset", null, "between")
top = Row([Caption("ISTANBUL", null, null, null, null, true), Icon("sun", "md", "accent")], "sm", "center", "between")
temp = Display("24°", "xl", null, "outfit")`,

  photoCard: `root = CardContainer([glass], null, "sm", null, photo, "end")
photo = BackgroundImage("https://images.unsplash.com/photo-1507525428034-b723cf961d3e", 0.1)
glass = Surface([Heading("Weekend in Kaş", "sm", "#FFFFFF"), Caption("Sea 24° · light breeze", null, "#FFFFFFCC")], null, "glass", "sm", "md", "xs")`,

  ringCard: `root = CardContainer([Heading("Today", "sm"), rings], null, null, "neon", null, "between")
rings = Row([Ring(72, "72%", "steps", "accent", null, "sm"), Ring(45, "45%", "sleep", "negative", null, "sm")], "sm", "center", "between")`,

  focusCard: `root = CardContainer([Caption("FOCUS", null, "#FFFFFFB3"), Display("2h 40m", "lg", "#FFFFFF", "space-grotesk"), Progress(64, null, null, "#FFFFFF")], null, null, null, mesh, "between")
mesh = MeshGradient(["#3A1C71", "#D76D77", "#2C3E50", "#FFAF7B"])`,

  gaugeCard: `root = CardContainer([Heading("Air quality", "sm"), Gauge(42, 0, 300, "42", "Good · AQI", "positive")], null, null, "midnight", null, "between")`,

  habitDetail: `root = Page([hero, streak, stats], "paper")
hero = Stack([Caption("HABIT", "muted"), Display("Read 30 minutes", "md"), Text("Day 23 of your reading streak.", "md", "muted")], "xs")
streak = Section("Last 12 weeks", [Heatmap([1, 0, 1, 3, 0, 0, 4, 2, 0, 1, 2, 0, 2, 0, 0, 0, 1, 1, 0, 0, 0, 2, 1, 0, 4, 2, 0, 0, 3, 3, 2, 0, 2, 2, 1, 0, 0, 0, 2, 4, 0, 1, 1, 0, 2, 0, 2, 1, 2, 4, 3, 0, 0, 2, 2, 3, 0, 1, 0, 2, 3, 0, 2, 0, 2, 0, 1, 3, 2, 1, 4, 1, 1, 2, 1, 1, 1, 0, 4, 0, 3, 4, 0, 0], 7, "accent")])
stats = Row([Ring(76, "76%", "this month", "accent"), Surface([Metric("Pages", "1,240"), Metric("Books", "4")], null, null, "md", "lg", "sm")], "md")`,

  htmlDetail: `<!doctype html>
<html>
<head>
<meta name="nook-theme" content="midnight">
<meta name="nook-state" content="sleep-note">
<style>
  h1 { font: 700 40px/1.1 system-ui; margin: 0 0 4px; letter-spacing: -1px; }
  .muted { color: var(--nook-text-secondary); }
  .bars { display: flex; gap: 10px; align-items: flex-end; height: 160px; margin: 24px 0; }
  .bar { flex: 1; border-radius: 10px; background: linear-gradient(var(--nook-accent), transparent); animation: grow .8s ease-out both; transform-origin: bottom; }
  @keyframes grow { from { transform: scaleY(0); } }
  textarea { width: 100%; box-sizing: border-box; min-height: 80px; border-radius: 12px; border: 1px solid var(--nook-border); background: var(--nook-background-element); color: inherit; padding: 12px; font: inherit; }
</style>
</head>
<body>
  <h1>7h 12m</h1>
  <div class="muted">Average sleep this week</div>
  <div class="bars" id="bars"></div>
  <textarea id="note" placeholder="How did you sleep?"></textarea>
  <script>
    var hours = [6.5, 7.2, 8.1, 6.9, 7.4, 7.8, 6.6];
    document.getElementById('bars').innerHTML = hours.map(function (h, i) {
      return '<div class="bar" style="height:' + (h / 9 * 100) + '%;animation-delay:' + i * 60 + 'ms"></div>';
    }).join('');
    var note = document.getElementById('note');
    note.value = nook.getState('sleep-note') || '';
    note.addEventListener('change', function () { nook.setField('sleep-note', note.value); });
  </script>
</body>
</html>`,

  htmlChartDetail: `<!doctype html>
<html>
<head>
<link rel="preconnect" href="https://fonts.gstatic.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&display=swap">
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js"></script>
<style>
  body { font-family: 'Space Grotesk', system-ui; }
  .card { border-radius: 20px; padding: 18px; background: linear-gradient(135deg, #1f1c2c, #928dab); color: #fff; }
  .big { font-size: 44px; font-weight: 700; letter-spacing: -1px; }
  a { color: var(--nook-accent); }
</style>
</head>
<body>
  <div class="card">
    <div>Portfolio</div>
    <div class="big">$12,480</div>
    <canvas id="chart" height="180"></canvas>
  </div>
  <p><a href="https://www.chartjs.org/">Made with Chart.js</a></p>
  <script>
    new Chart(document.getElementById('chart'), {
      type: 'line',
      data: { labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], datasets: [{ data: [11200, 11650, 11420, 12010, 12480], borderColor: '#fff', backgroundColor: 'rgba(255,255,255,.18)', fill: true, tension: .4, pointRadius: 0 }] },
      options: { plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#fff' }, grid: { display: false } }, y: { display: false } } }
    });
  </script>
</body>
</html>`,

  eventDetail: `root = Page([hero, info], "aurora")
hero = Surface([Caption("CONCERT"), Display("Sat 20:00", "lg"), Countdown("2026-10-03T20:00:00+03:00", "Doors open in", "compact")], null, "glass", "lg", "lg", "sm")
info = Surface([KeyValue([{label: "Venue", value: "Zorlu PSM"}, {label: "Seat", value: "B-14"}])], null, "tint", "md", "lg")`,
} as const;
