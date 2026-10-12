using System.Collections.Generic;
using GameCult.Caching;
using MessagePack;

namespace GameCult.Thing.Contract;

[Union(0, typeof(BoxNode))]
[Union(1, typeof(TextNode))]
[Union(2, typeof(ImageNode))]
[Union(3, typeof(ButtonNode))]
[Union(4, typeof(ToggleNode))]
[Union(5, typeof(SliderNode))]
[Union(6, typeof(TextInputNode))]
[Union(7, typeof(SelectNode))]
[Union(8, typeof(RepeatNode))]
[Union(9, typeof(OverlayNode))]
[Union(10, typeof(PlotNode))]
[Union(11, typeof(EmbedNode))]
[Union(12, typeof(UseNode))]
public abstract class Node
{
    internal Node() { }
}

[MessagePackObject]
public sealed class BoxNode : Node
{
    [Key(0)] public NodeCommon Common { get; }
    [Key(1)] public BoxStyle Style { get; }
    [Key(2)] public Paint Paint { get; }
    [Key(3)] public Role Role { get; }
    [Key(4)] public List<Node> Children { get; }

    public BoxNode(NodeCommon common, BoxStyle style, Paint paint, Role role, List<Node> children)
    {
        Common = common;
        Style = style;
        Paint = paint;
        Role = role;
        Children = children;
    }
}

[MessagePackObject]
public sealed class TextNode : Node
{
    [Key(0)] public NodeCommon Common { get; }
    [Key(1)] public TextSource Content { get; }
    [Key(2)] public string StyleToken { get; }
    [Key(3)] public bool Wrap { get; }
    [Key(4)] public int? MaxLines { get; }
    [Key(5)] public bool Selectable { get; }

    public TextNode(NodeCommon common, TextSource content, string styleToken, bool wrap, int? maxLines, bool selectable)
    {
        Common = common;
        Content = content;
        StyleToken = styleToken;
        Wrap = wrap;
        MaxLines = ThingDomain.Count(maxLines);
        Selectable = selectable;
    }
}

[MessagePackObject]
public sealed class ImageNode : Node
{
    [Key(0)] public NodeCommon Common { get; }
    [Key(1)] public string Catalog { get; }
    [Key(2)] public string Asset { get; }
    [Key(3)] public ImageFit Fit { get; }
    [Key(4)] public TextSource Alt { get; }

    public ImageNode(NodeCommon common, string catalog, string asset, ImageFit fit, TextSource alt)
    {
        Common = common;
        Catalog = catalog;
        Asset = asset;
        Fit = fit;
        Alt = alt;
    }
}

[MessagePackObject]
public sealed class ButtonNode : Node
{
    [Key(0)] public NodeCommon Common { get; }
    [Key(1)] public List<Node> Content { get; }
    [Key(2)] public CommandRef OnActivate { get; }
    [Key(3)] public BoolSource Enabled { get; }

    public ButtonNode(NodeCommon common, List<Node> content, CommandRef onActivate, BoolSource enabled)
    {
        Common = common;
        Content = content;
        OnActivate = onActivate;
        Enabled = enabled;
    }
}

[MessagePackObject]
public sealed class ToggleNode : Node
{
    [Key(0)] public NodeCommon Common { get; }
    [Key(1)] public BoolSource Checked { get; }
    [Key(2)] public CommandRef OnChange { get; }

    public ToggleNode(NodeCommon common, BoolSource @checked, CommandRef onChange)
    {
        Common = common;
        Checked = @checked;
        OnChange = onChange;
    }
}

[MessagePackObject]
public sealed class SliderNode : Node
{
    [Key(0)] public NodeCommon Common { get; }
    [Key(1)] public double Min { get; }
    [Key(2)] public double Max { get; }
    [Key(3)] public double Step { get; }
    [Key(4)] public NumberSource Value { get; }
    [Key(5)] public CommandRef Commit { get; }

    public SliderNode(NodeCommon common, double min, double max, double step, NumberSource value, CommandRef commit)
    {
        Common = common;
        Min = min;
        Max = max;
        Step = step;
        Value = value;
        Commit = commit;
    }
}

[MessagePackObject]
public sealed class TextInputNode : Node
{
    [Key(0)] public NodeCommon Common { get; }
    [Key(1)] public bool Multiline { get; }
    [Key(2)] public InputKind Kind { get; }
    [Key(3)] public TextSource Placeholder { get; }
    [Key(4)] public TextSource Initial { get; }
    [Key(5)] public CommandRef Submit { get; }

    public TextInputNode(NodeCommon common, bool multiline, InputKind kind, TextSource placeholder, TextSource initial, CommandRef submit)
    {
        Common = common;
        Multiline = multiline;
        Kind = kind;
        Placeholder = placeholder;
        Initial = initial;
        Submit = submit;
    }
}

[MessagePackObject]
public sealed class SelectNode : Node
{
    [Key(0)] public NodeCommon Common { get; }
    [Key(1)] public OptionList Options { get; }
    [Key(2)] public Bind Value { get; }
    [Key(3)] public CommandRef OnChange { get; }

    public SelectNode(NodeCommon common, OptionList options, Bind value, CommandRef onChange)
    {
        Common = common;
        Options = options;
        Value = value;
        OnChange = onChange;
    }
}

[MessagePackObject]
public sealed class RepeatNode : Node
{
    [Key(0)] public NodeCommon Common { get; }
    [Key(1)] public CollectionSource Collection { get; }
    [Key(2)] public MemberPath KeyMember { get; }
    [Key(3)] public Node Template { get; }

    public RepeatNode(NodeCommon common, CollectionSource collection, MemberPath keyMember, Node template)
    {
        Common = common;
        Collection = collection;
        KeyMember = keyMember;
        Template = template;
    }
}

[MessagePackObject]
public sealed class OverlayNode : Node
{
    [Key(0)] public NodeCommon Common { get; }
    [Key(1)] public Anchor Anchor { get; }
    [Key(2)] public bool Modal { get; }
    [Key(3)] public CommandRef Dismiss { get; }
    [Key(4)] public List<Node> Children { get; }

    public OverlayNode(NodeCommon common, Anchor anchor, bool modal, CommandRef dismiss, List<Node> children)
    {
        Common = common;
        Anchor = anchor;
        Modal = modal;
        Dismiss = dismiss;
        Children = children;
    }
}

[MessagePackObject]
public sealed class PlotNode : Node
{
    [Key(0)] public NodeCommon Common { get; }
    [Key(1)] public Bind Series { get; }
    [Key(2)] public PlotMark Mark { get; }
    [Key(3)] public double? XMin { get; }
    [Key(4)] public double? XMax { get; }
    [Key(5)] public double? YMin { get; }
    [Key(6)] public double? YMax { get; }

    public PlotNode(NodeCommon common, Bind series, PlotMark mark, double? xMin, double? xMax, double? yMin, double? yMax)
    {
        Common = common;
        Series = series;
        Mark = mark;
        XMin = xMin;
        XMax = xMax;
        YMin = yMin;
        YMax = yMax;
    }
}

[MessagePackObject]
public sealed class EmbedNode : Node
{
    [Key(0)] public NodeCommon Common { get; }
    [Key(1)] public string SlotKind { get; }
    [Key(2)] public string SlotId { get; }
    [Key(3)] public double Width { get; }
    [Key(4)] public double Height { get; }

    public EmbedNode(NodeCommon common, string slotKind, string slotId, double width, double height)
    {
        Common = common;
        SlotKind = slotKind;
        SlotId = slotId;
        Width = width;
        Height = height;
    }
}

[MessagePackObject]
public sealed class UseNode : Node
{
    [Key(0)] public NodeCommon Common { get; }
    [Key(1)] public CompositionRef Composition { get; }
    [Key(2)] public List<Arg> Args { get; }

    public UseNode(NodeCommon common, CompositionRef composition, List<Arg> args)
    {
        Common = common;
        Composition = composition;
        Args = args;
    }
}

[Union(0, typeof(ImageFitContain))]
[Union(1, typeof(ImageFitCover))]
[Union(2, typeof(ImageFitFill))]
[Union(3, typeof(ImageFitUnscaled))]
public abstract class ImageFit
{
    internal ImageFit() { }
    public static ImageFit Contain => ImageFitContain.Instance;
    public static ImageFit Cover => ImageFitCover.Instance;
    public static ImageFit Fill => ImageFitFill.Instance;
    public static ImageFit Unscaled => ImageFitUnscaled.Instance;
}

[MessagePackObject(AllowPrivate = true)]
public sealed class ImageFitContain : ImageFit
{
    internal static readonly ImageFitContain Instance = new ImageFitContain();

    [SerializationConstructor] private ImageFitContain() { }
}

[MessagePackObject(AllowPrivate = true)]
public sealed class ImageFitCover : ImageFit
{
    internal static readonly ImageFitCover Instance = new ImageFitCover();

    [SerializationConstructor] private ImageFitCover() { }
}

[MessagePackObject(AllowPrivate = true)]
public sealed class ImageFitFill : ImageFit
{
    internal static readonly ImageFitFill Instance = new ImageFitFill();

    [SerializationConstructor] private ImageFitFill() { }
}

[MessagePackObject(AllowPrivate = true)]
public sealed class ImageFitUnscaled : ImageFit
{
    internal static readonly ImageFitUnscaled Instance = new ImageFitUnscaled();

    [SerializationConstructor] private ImageFitUnscaled() { }
}

[Union(0, typeof(InputKindText))]
[Union(1, typeof(InputKindNumber))]
public abstract class InputKind
{
    internal InputKind() { }
    public static InputKind Text => InputKindText.Instance;
    public static InputKind Number => InputKindNumber.Instance;
}

[MessagePackObject(AllowPrivate = true)]
public sealed class InputKindText : InputKind
{
    internal static readonly InputKindText Instance = new InputKindText();

    [SerializationConstructor] private InputKindText() { }
}

[MessagePackObject(AllowPrivate = true)]
public sealed class InputKindNumber : InputKind
{
    internal static readonly InputKindNumber Instance = new InputKindNumber();

    [SerializationConstructor] private InputKindNumber() { }
}

[Union(0, typeof(LiteralOptions))]
[Union(1, typeof(BoundOptions))]
public abstract class OptionList
{
    internal OptionList() { }
}

[MessagePackObject]
public sealed class LiteralOptions : OptionList
{
    [Key(0)] public List<SelectOption> Options { get; }

    public LiteralOptions(List<SelectOption> options)
    {
        Options = options;
    }
}

[MessagePackObject]
public sealed class BoundOptions : OptionList
{
    [Key(0)] public CollectionSource Collection { get; }
    [Key(1)] public MemberPath ValueMember { get; }
    [Key(2)] public MemberPath LabelMember { get; }

    public BoundOptions(CollectionSource collection, MemberPath valueMember, MemberPath labelMember)
    {
        Collection = collection;
        ValueMember = valueMember;
        LabelMember = labelMember;
    }
}

[Union(0, typeof(AnchorViewport))]
[Union(1, typeof(AnchorNode))]
public abstract class Anchor
{
    internal Anchor() { }
    public static Anchor Viewport => AnchorViewport.Instance;
}

[MessagePackObject(AllowPrivate = true)]
public sealed class AnchorViewport : Anchor
{
    internal static readonly AnchorViewport Instance = new AnchorViewport();

    [SerializationConstructor] private AnchorViewport() { }
}

[MessagePackObject]
public sealed class AnchorNode : Anchor
{
    [Key(0)] public string Node { get; }

    public AnchorNode(string node)
    {
        Node = node;
    }
}

[Union(0, typeof(PlotMarkLine))]
[Union(1, typeof(PlotMarkBar))]
[Union(2, typeof(PlotMarkArea))]
public abstract class PlotMark
{
    internal PlotMark() { }
    public static PlotMark Line => PlotMarkLine.Instance;
    public static PlotMark Bar => PlotMarkBar.Instance;
    public static PlotMark Area => PlotMarkArea.Instance;
}

[MessagePackObject(AllowPrivate = true)]
public sealed class PlotMarkLine : PlotMark
{
    internal static readonly PlotMarkLine Instance = new PlotMarkLine();

    [SerializationConstructor] private PlotMarkLine() { }
}

[MessagePackObject(AllowPrivate = true)]
public sealed class PlotMarkBar : PlotMark
{
    internal static readonly PlotMarkBar Instance = new PlotMarkBar();

    [SerializationConstructor] private PlotMarkBar() { }
}

[MessagePackObject(AllowPrivate = true)]
public sealed class PlotMarkArea : PlotMark
{
    internal static readonly PlotMarkArea Instance = new PlotMarkArea();

    [SerializationConstructor] private PlotMarkArea() { }
}

[Union(0, typeof(TextArg))]
[Union(1, typeof(NumberArg))]
[Union(2, typeof(BoolArg))]
[Union(3, typeof(ArgValueBind))]
[Union(4, typeof(CollectionArg))]
[Union(5, typeof(CommandArg))]
[Union(6, typeof(SlotArg))]
public abstract class ArgValue
{
    internal ArgValue() { }
}

[MessagePackObject]
public sealed class TextArg : ArgValue
{
    [Key(0)] public string Value { get; }

    public TextArg(string value)
    {
        Value = value;
    }
}

[MessagePackObject]
public sealed class NumberArg : ArgValue
{
    [Key(0)] public double Value { get; }

    public NumberArg(double value)
    {
        Value = value;
    }
}

[MessagePackObject]
public sealed class BoolArg : ArgValue
{
    [Key(0)] public bool Value { get; }

    public BoolArg(bool value)
    {
        Value = value;
    }
}

[MessagePackObject]
public sealed class ArgValueBind : ArgValue
{
    [Key(0)] public StateSource Source { get; }
    [Key(1)] public MemberPath Member { get; }
    [Key(2)] public Format? Format { get; }

    public ArgValueBind(StateSource source, MemberPath member, Format? format)
    {
        Source = source;
        Member = member;
        Format = format;
    }
}

[MessagePackObject]
public sealed class CollectionArg : ArgValue
{
    [Key(0)] public CollectionSource Source { get; }

    public CollectionArg(CollectionSource source)
    {
        Source = source;
    }
}

[MessagePackObject]
public sealed class CommandArg : ArgValue
{
    [Key(0)] public CommandRef Command { get; }

    public CommandArg(CommandRef command)
    {
        Command = command;
    }
}

[MessagePackObject]
public sealed class SlotArg : ArgValue
{
    [Key(0)] public List<Node> Nodes { get; }

    public SlotArg(List<Node> nodes)
    {
        Nodes = nodes;
    }
}

[Union(0, typeof(ParamKindText))]
[Union(1, typeof(ParamKindNumber))]
[Union(2, typeof(ParamKindBool))]
[Union(3, typeof(ParamKindBind))]
[Union(4, typeof(ParamKindCollection))]
[Union(5, typeof(ParamKindCommand))]
[Union(6, typeof(ParamKindSlot))]
public abstract class ParamKind
{
    internal ParamKind() { }
    public static ParamKind Text => ParamKindText.Instance;
    public static ParamKind Number => ParamKindNumber.Instance;
    public static ParamKind Bool => ParamKindBool.Instance;
    public static ParamKind Bind => ParamKindBind.Instance;
    public static ParamKind Collection => ParamKindCollection.Instance;
    public static ParamKind Command => ParamKindCommand.Instance;
    public static ParamKind Slot => ParamKindSlot.Instance;
}

[MessagePackObject(AllowPrivate = true)]
public sealed class ParamKindText : ParamKind
{
    internal static readonly ParamKindText Instance = new ParamKindText();

    [SerializationConstructor] private ParamKindText() { }
}

[MessagePackObject(AllowPrivate = true)]
public sealed class ParamKindNumber : ParamKind
{
    internal static readonly ParamKindNumber Instance = new ParamKindNumber();

    [SerializationConstructor] private ParamKindNumber() { }
}

[MessagePackObject(AllowPrivate = true)]
public sealed class ParamKindBool : ParamKind
{
    internal static readonly ParamKindBool Instance = new ParamKindBool();

    [SerializationConstructor] private ParamKindBool() { }
}

[MessagePackObject(AllowPrivate = true)]
public sealed class ParamKindBind : ParamKind
{
    internal static readonly ParamKindBind Instance = new ParamKindBind();

    [SerializationConstructor] private ParamKindBind() { }
}

[MessagePackObject(AllowPrivate = true)]
public sealed class ParamKindCollection : ParamKind
{
    internal static readonly ParamKindCollection Instance = new ParamKindCollection();

    [SerializationConstructor] private ParamKindCollection() { }
}

[MessagePackObject(AllowPrivate = true)]
public sealed class ParamKindCommand : ParamKind
{
    internal static readonly ParamKindCommand Instance = new ParamKindCommand();

    [SerializationConstructor] private ParamKindCommand() { }
}

[MessagePackObject(AllowPrivate = true)]
public sealed class ParamKindSlot : ParamKind
{
    internal static readonly ParamKindSlot Instance = new ParamKindSlot();

    [SerializationConstructor] private ParamKindSlot() { }
}

[MessagePackObject]
public sealed class NodeCommon
{
    [Key(0)] public string Id { get; }
    [Key(1)] public BoolSource Visible { get; }
    [Key(2)] public TextSource? A11yLabel { get; }

    public NodeCommon(string id, BoolSource visible, TextSource? a11yLabel)
    {
        Id = id;
        Visible = visible;
        A11yLabel = a11yLabel;
    }
}

[MessagePackObject]
public sealed class SelectOption
{
    [Key(0)] public string Value { get; }
    [Key(1)] public string Label { get; }

    public SelectOption(string value, string label)
    {
        Value = value;
        Label = label;
    }
}

[MessagePackObject]
public sealed class CompositionRef
{
    [Key(0)] public string Publisher { get; }
    [Key(1)] public string Name { get; }
    [Key(2)] public long Version { get; }

    public CompositionRef(string publisher, string name, long version)
    {
        Publisher = publisher;
        Name = ThingDomain.Segment(name);
        Version = ThingDomain.Version(version);
    }
}

[MessagePackObject]
public sealed class Arg
{
    [Key(0)] public string Name { get; }
    [Key(1)] public ArgValue Value { get; }

    public Arg(string name, ArgValue value)
    {
        Name = name;
        Value = value;
    }
}

[MessagePackObject]
public sealed class ParamDecl
{
    [Key(0)] public string Name { get; }
    [Key(1)] public ParamKind Kind { get; }

    public ParamDecl(string name, ParamKind kind)
    {
        Name = name;
        Kind = kind;
    }
}

[CultDocument("gamecult.thing.surface", "gamecult.thing.surface.v1")]
[MessagePackObject]
public sealed class SurfaceDocument
{
    [Key(0)] public string ProviderId { get; }
    [Key(1)] public string Label { get; }
    [Key(2)] public long Version { get; }
    [Key(3)] public string Title { get; }
    [Key(4)] public Node Root { get; }
    [Key(5)] public List<CommandDecl> Commands { get; }

    public SurfaceDocument(string providerId, string label, long version, string title, Node root, List<CommandDecl> commands)
    {
        ProviderId = providerId;
        Label = ThingDomain.Segment(label);
        Version = ThingDomain.Version(version);
        Title = title;
        Root = root;
        Commands = commands;
    }

    [IgnoreMember] public string RecordKey => ThingKeys.SurfaceKey(ProviderId, Label);
}

[CultDocument("gamecult.thing.composition", "gamecult.thing.composition.v1")]
[MessagePackObject]
public sealed class CompositionDocument
{
    [Key(0)] public string Publisher { get; }
    [Key(1)] public string Name { get; }
    [Key(2)] public long Version { get; }
    [Key(3)] public List<ParamDecl> Params { get; }
    [Key(4)] public Node Body { get; }

    public CompositionDocument(string publisher, string name, long version, List<ParamDecl> @params, Node body)
    {
        Publisher = publisher;
        Name = ThingDomain.Segment(name);
        Version = ThingDomain.Version(version);
        Params = @params;
        Body = body;
    }

    [IgnoreMember] public string RecordKey => ThingKeys.CompositionKey(Publisher, Name, Version);
}
