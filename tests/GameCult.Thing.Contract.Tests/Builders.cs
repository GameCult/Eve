using GameCult.Thing.Contract;

namespace GameCult.Thing.Contract.Tests;

/// <summary>
/// The values the goldens and the other tests share, ported from crates/thing-contract/tests/common/mod.rs and
/// tests/goldens.rs. Every value is built through the package's public constructors; no bytes are spelled here.
/// </summary>
internal static class Builders
{
    // A Bind's slots, held until a union arm takes them: the arms carry the slots flat, so there is no shared Bind arm.
    internal sealed record BindParts(StateSource Source, MemberPath Member, Format? Format)
    {
        public Bind ToBind() => new(Source, Member, Format);
        public TextSource Text() => new TextSourceBound(Source, Member, Format);
        public NumberSource Number() => new NumberSourceBound(Source, Member, Format);
        public BoolSource Bool() => new BoolSourceBound(Source, Member, Format);
        public CollectionSource Collection() => new CollectionSourceMember(Source, Member, Format);
        public ArgValue Arg() => new ArgValueBind(Source, Member, Format);
    }

    public static TextSource LitText(string value) => new TextLiteral(value);
    public static BoolSource LitBool(bool value) => new BoolLiteral(value);
    public static NumberSource LitNumber(double value) => new NumberLiteral(value);

    public static MemberPath Names(params string[] names) =>
        new(names.Select(name => (MemberStep)new MemberName(name)).ToList());

    public static BindParts RecordBind(MemberPath member, Format? format) =>
        new(new StateRef("provider.a", "gamecult.thing.test.v1", "row-1"), member, format);

    public static BindParts ItemBind(MemberPath member) => new(StateSource.Item, member, null);

    public static CommandRef Command(string id) => new CommandIdRef(id);

    public static NodeCommon Common(string id) => new(id, LitBool(true), null);

    public static Dimension Px(double value) => new DimensionPx(value);

    public static Size2 Size(Dimension width, Dimension height) => new(width, height);

    public static Edges AllEdges(Dimension all) => new(all, all, all, all);

    public static BoxStyle Style(
        Display? display = null,
        Direction? direction = null,
        Wrap? wrap = null,
        Position? position = null,
        Overflow? overflow = null,
        ItemAlign? alignItems = null,
        ItemAlign? alignSelf = null,
        ContentAlign? alignContent = null,
        ContentAlign? justifyContent = null,
        Dimension? basis = null,
        List<Dimension>? gridColumns = null,
        List<Dimension>? gridRows = null) =>
        new(
            display ?? Display.Flex,
            direction ?? Direction.Column,
            wrap ?? Wrap.NoWrap,
            Size(Px(4), Px(8)),
            AllEdges(Px(2)),
            AllEdges(Dimension.Auto),
            Size(new DimensionPercent(100), Dimension.Content),
            Size(Px(0), Px(0)),
            Size(Dimension.Auto, Dimension.Auto),
            position ?? Position.Relative,
            AllEdges(Dimension.Auto),
            overflow ?? Overflow.Visible,
            alignItems ?? ItemAlign.Stretch,
            alignSelf ?? ItemAlign.Auto,
            alignContent ?? ContentAlign.Start,
            justifyContent ?? ContentAlign.SpaceBetween,
            1.0,
            0.0,
            basis ?? Dimension.Auto,
            gridColumns ?? new List<Dimension>(),
            gridRows ?? new List<Dimension>());

    public static Paint PlainPaint() => new(null, null, 0.0);

    public static Node Boxed(string id, params Node[] children) =>
        new BoxNode(Common(id), Style(), PlainPaint(), Role.Group, children.ToList());

    public static Node Text(string id, string content) =>
        new TextNode(Common(id), LitText(content), "body", true, null, false);

    public static CommandInvocation Invocation() => new(
        "3f2b8c1e-5d44-4a6b-9a07-1c2d3e4f5a6b",
        "thing:surface:provider.a.main",
        7,
        "go",
        new RecordPayload("gamecult.thing.test.go.v1", new byte[] { 0x91, 0x01, 0xff, 0x00 }),
        new List<CapturedInput>
        {
            new("name-input", new TextValue("Ada")),
            new("level", new NumberValue(0.75)),
            new("flag", new BoolValue(true)),
            new("pick", new ChoiceValue("a")),
        },
        "renderer.web",
        "2026-01-01T00:00:00Z",
        "delegate-1");

    public static CommandInvocation InvocationNamed(string id) => new(
        id, "thing:surface:provider.a.main", 7, "go",
        new RecordPayload("gamecult.thing.test.go.v1", new byte[] { 0x91, 0x01, 0xff, 0x00 }),
        new List<CapturedInput>(), "renderer.web", "2026-01-01T00:00:00Z", null);

    public static List<BindParts> BindAllFormats()
    {
        var number = new NumberFormat(2, true, "ms");
        var affix = new AffixFormat("$", "/s");
        var indexed = new MemberPath(new List<MemberStep> { new MemberName("items"), new MemberIndex(3) });
        return new List<BindParts>
        {
            RecordBind(indexed, number),
            RecordBind(Names("elapsed"), Format.Duration),
            RecordBind(Names("at"), Format.Timestamp),
            RecordBind(Names("price"), affix),
            RecordBind(Names("plain"), null),
            ItemBind(Names("name")),
        };
    }

    public static SurfaceDocument FullSurface()
    {
        var binds = BindAllFormats();
        var boundText = binds[3].Text();
        var boundBool = binds[4].Bool();
        var boundNumber = binds[0].Number();

        var painted = new BoxNode(
            new NodeCommon("painted", new BoolSourceParam("show"), new TextSourceParam("label")),
            Style(
                display: Display.Grid,
                direction: Direction.RowReverse,
                wrap: Wrap.WrapReverse,
                position: Position.Absolute,
                overflow: Overflow.Scroll,
                alignItems: ItemAlign.Baseline,
                alignSelf: ItemAlign.Center,
                alignContent: ContentAlign.SpaceAround,
                justifyContent: ContentAlign.SpaceEvenly,
                gridColumns: new List<Dimension> { new DimensionFr(1), Px(120) },
                gridRows: new List<Dimension> { Dimension.Content }),
            new Paint(new ThemeToken("surface.raised"), new Border(new Rgba(1, 2, 3, 255), 1.5), 4.0),
            Role.Region,
            new List<Node> { Text("deep-text", "deep") });

        var repeat = new RepeatNode(
            Common("rows"),
            new RecordsSource(null, "gamecult.thing.test.v1", "row-"),
            Names("id"),
            new TextNode(Common("row-name"), ItemBind(Names("name")).Text(), "body", false, 2, true));

        var leaves = new List<Node>
        {
            new TextNode(Common("t-bound"), boundText, "label", true, null, false),
            new ImageNode(Common("img"), "icons", "gear", ImageFit.Cover, LitText("a gear")),
            new ButtonNode(Common("go"), new List<Node> { Text("go-label", "Go") }, Command("go"), boundBool),
            new ToggleNode(Common("flag"), boundBool, new CommandRefParam("toggle")),
            new SliderNode(Common("level"), 0.0, 1.0, 0.25, boundNumber, Command("set-level")),
            new TextInputNode(Common("name-input"), true, InputKind.Number, LitText("name"), new TextSourceParam("initial"), Command("rename")),
            new TextInputNode(Common("title-input"), false, InputKind.Text, LitText("title"), new TextSourceParam("initial"), Command("retitle")),
            new SelectNode(
                Common("pick"),
                new LiteralOptions(new List<SelectOption> { new("a", "Alpha") }),
                binds[4].ToBind(),
                Command("pick")),
            new SelectNode(
                Common("pick-bound"),
                new BoundOptions(binds[0].Collection(), Names("id"), Names("name")),
                binds[5].ToBind(),
                Command("pick")),
            repeat,
            new OverlayNode(Common("menu"), new AnchorNode("go"), false, Command("close"), new List<Node> { Text("menu-item", "one") }),
            new OverlayNode(Common("dialog"), Anchor.Viewport, true, Command("close"), new List<Node>()),
            new PlotNode(Common("trend"), binds[1].ToBind(), PlotMark.Area, 0.0, null, null, 100.0),
            new EmbedNode(Common("viewport"), "world.scene", "main", 640.0, 480.0),
            new UseNode(
                Common("kv"),
                new CompositionRef("thing.std", "key-value", 1),
                new List<Arg> { new("key", new TextArg("k")) }),
        };

        var deep = Boxed("d4", painted);
        foreach (var id in new[] { "d3", "d2", "d1" }) deep = Boxed(id, deep);
        var children = new List<Node> { deep };
        children.AddRange(leaves);
        children.Add(new PlotNode(Common("trend-line"), binds[2].ToBind(), PlotMark.Line, null, null, null, null));
        children.Add(new PlotNode(Common("trend-bar"), binds[2].ToBind(), PlotMark.Bar, null, null, null, null));
        var fits = new[] { ImageFit.Contain, ImageFit.Fill, ImageFit.Unscaled };
        for (var index = 0; index < fits.Length; index++)
            children.Add(new ImageNode(Common($"img-fit-{index}"), "icons", "gear", fits[index], LitText("")));
        var roles = new[] { Role.List, Role.ListItem, Role.Heading, Role.Dialog, Role.Toolbar };
        for (var index = 0; index < roles.Length; index++)
        {
            var roleStyle = index == 0
                ? Style(direction: Direction.Row, alignContent: ContentAlign.Auto, justifyContent: ContentAlign.Stretch)
                : Style();
            children.Add(new BoxNode(Common($"role-{index}"), roleStyle, PlainPaint(), roles[index], new List<Node>()));
        }

        children.Add(new BoxNode(
            Common("block"),
            Style(
                display: Display.Block,
                direction: Direction.ColumnReverse,
                wrap: Wrap.Wrapped,
                overflow: Overflow.Clip,
                alignContent: ContentAlign.Center,
                justifyContent: ContentAlign.End,
                alignItems: ItemAlign.End,
                alignSelf: ItemAlign.Start,
                basis: Dimension.Content),
            PlainPaint(),
            Role.Group,
            new List<Node>()));
        children.Add(new TextNode(Common("t-param"), new TextSourceParam("title"), "title", true, null, false));
        children.Add(new ToggleNode(new NodeCommon("literal-number", new BoolSourceParam("v"), null), LitBool(false), Command("toggle")));
        children.Add(new SliderNode(Common("slider-literal"), -1.0, 1.0, 0.5, LitNumber(0.5), Command("set-level")));
        children.Add(new SliderNode(Common("slider-param"), 0.0, 10.0, 1.0, new NumberSourceParam("n"), Command("set-level")));
        children.Add(new RepeatNode(Common("rows-param"), new CollectionSourceParam("rows"), Names("id"), Text("row-param", "r")));

        return new SurfaceDocument(
            "provider.a",
            "main",
            7,
            "All arms",
            Boxed("root", children.ToArray()),
            new List<CommandDecl>
            {
                new("go", "gamecult.thing.test.go.v1", new List<string> { "name-input", "level" }, "Go now?"),
                new("close", "gamecult.thing.test.close.v1", new List<string>(), null),
            });
    }

    public static CompositionDocument FullComposition()
    {
        var args = new List<Arg>
        {
            new("text", new TextArg("t")),
            new("number", new NumberArg(2.5)),
            new("bool", new BoolArg(true)),
            new("bind", RecordBind(Names("x"), null).Arg()),
            new("collection", new CollectionArg(new CollectionSourceParam("rows"))),
            new("command", new CommandArg(Command("go"))),
            new("slot", new SlotArg(new List<Node> { Text("slot-text", "inside"), Boxed("slot-box") })),
        };
        var innerUse = new UseNode(Common("inner"), new CompositionRef("thing.std", "card", 2), args);
        return new CompositionDocument(
            "provider.a",
            "panel",
            3,
            new List<ParamDecl>
            {
                new("title", ParamKind.Text),
                new("count", ParamKind.Number),
                new("on", ParamKind.Bool),
                new("source", ParamKind.Bind),
                new("rows", ParamKind.Collection),
                new("act", ParamKind.Command),
                new("body", ParamKind.Slot),
            },
            Boxed("panel-root", Text("panel-title", "t"), innerUse));
    }

    public static List<(string Name, CommandResult Result)> Results(CommandInvocation invocation) => new()
    {
        ("result-pending", CommandResult.Pending(invocation, 1, "working")),
        ("result-completed", CommandResult.Completed(invocation, 2, 8, true, null)),
        ("result-completed-open-surface", CommandResult.Completed(invocation, 3, null, false, new OpenSurfaceEffect("thing:surface:provider.a.next"))),
        ("result-completed-open-external", CommandResult.Completed(invocation, 4, 9, true, new OpenExternalEffect("https://example.test/auth", Command("resume")))),
        ("result-denied", CommandResult.Denied(invocation, 5, "not yours", "go")),
        ("result-denied-no-node", CommandResult.Denied(invocation, 6, "not allowed", null)),
        ("result-failed", CommandResult.Failed(invocation, 7, "broke")),
    };

    public static AssetCatalog FullAssetCatalog() => new(
        "provider.a",
        "icons",
        2,
        new List<AssetEntry>
        {
            new("gear", "image/png", "assets/gear.png", 32, 32),
            new("bolt", "image/svg+xml", "assets/bolt.svg", 0, 0),
        });

    public static SurfaceDocument SurfaceOf(string provider, string label) =>
        new(provider, label, 1, "", Boxed("r"), new List<CommandDecl>());

    public static CompositionDocument CompositionOf(string publisher, string name, long version) =>
        new(publisher, name, version, new List<ParamDecl>(), Boxed("r"));

    public static AssetCatalog CatalogOf(string provider, string id) => new(provider, id, 1, new List<AssetEntry>());
}
