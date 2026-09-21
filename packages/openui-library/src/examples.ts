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
} as const;
