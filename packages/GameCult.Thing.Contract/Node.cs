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
    [Key(4)] public IReadOnlyList<Node> Children { get; }

    public BoxNode(NodeCommon common, BoxStyle style, Paint paint, Role role, IReadOnlyList<Node> children)
    {
        Common = ThingDomain.Present(common, "Common");
        Style = ThingDomain.Present(style, "Style");
        Paint = ThingDomain.Present(paint, "Paint");
        Role = ThingDomain.Present(role, "Role");
        Children = ThingDomain.Items(children, "Children");
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
        Common = ThingDomain.Present(common, "Common");
        Content = ThingDomain.Present(content, "Content");
        StyleToken = ThingDomain.Present(styleToken, "StyleToken");
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
        Common = ThingDomain.Present(common, "Common");
        Catalog = ThingDomain.Present(catalog, "Catalog");
        Asset = ThingDomain.Present(asset, "Asset");
        Fit = ThingDomain.Present(fit, "Fit");
        Alt = ThingDomain.Present(alt, "Alt");
    }
}

[MessagePackObject]
public sealed class ButtonNode : Node
{
    [Key(0)] public NodeCommon Common { get; }
    [Key(1)] public IReadOnlyList<Node> Content { get; }
    [Key(2)] public CommandRef OnActivate { get; }
    [Key(3)] public BoolSource Enabled { get; }

    public ButtonNode(NodeCommon common, IReadOnlyList<Node> content, CommandRef onActivate, BoolSource enabled)
    {
        Common = ThingDomain.Present(common, "Common");
        Content = ThingDomain.Items(content, "Content");
        OnActivate = ThingDomain.Present(onActivate, "OnActivate");
        Enabled = ThingDomain.Present(enabled, "Enabled");
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
        Common = ThingDomain.Present(common, "Common");
        Checked = ThingDomain.Present(@checked, "Checked");
        OnChange = ThingDomain.Present(onChange, "OnChange");
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
        Common = ThingDomain.Present(common, "Common");
        Min = min;
        Max = max;
        Step = step;
        Value = ThingDomain.Present(value, "Value");
        Commit = ThingDomain.Present(commit, "Commit");
    }
}

[MessagePackObject]
public sealed class TextInputNode : Node
{
    [Key(0)] public NodeCommon Common { get; }
    [Key(1)] public bool Multiline { get; }
    [Key(2)] public InputKind InputKind { get; }
    [Key(3)] public TextSource Placeholder { get; }
    [Key(4)] public TextSource Initial { get; }
    [Key(5)] public CommandRef Submit { get; }

    public TextInputNode(NodeCommon common, bool multiline, InputKind inputKind, TextSource placeholder, TextSource initial, CommandRef submit)
    {
        Common = ThingDomain.Present(common, "Common");
        Multiline = multiline;
        InputKind = ThingDomain.Present(inputKind, "InputKind");
        Placeholder = ThingDomain.Present(placeholder, "Placeholder");
        Initial = ThingDomain.Present(initial, "Initial");
        Submit = ThingDomain.Present(submit, "Submit");
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
        Common = ThingDomain.Present(common, "Common");
        Options = ThingDomain.Present(options, "Options");
        Value = ThingDomain.Present(value, "Value");
        OnChange = ThingDomain.Present(onChange, "OnChange");
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
        Common = ThingDomain.Present(common, "Common");
        Collection = ThingDomain.Present(collection, "Collection");
        KeyMember = ThingDomain.Present(keyMember, "KeyMember");
        Template = ThingDomain.Present(template, "Template");
    }
}

[MessagePackObject]
public sealed class OverlayNode : Node
{
    [Key(0)] public NodeCommon Common { get; }
    [Key(1)] public Anchor Anchor { get; }
    [Key(2)] public bool Modal { get; }
    [Key(3)] public CommandRef Dismiss { get; }
    [Key(4)] public IReadOnlyList<Node> Children { get; }

    public OverlayNode(NodeCommon common, Anchor anchor, bool modal, CommandRef dismiss, IReadOnlyList<Node> children)
    {
        Common = ThingDomain.Present(common, "Common");
        Anchor = ThingDomain.Present(anchor, "Anchor");
        Modal = modal;
        Dismiss = ThingDomain.Present(dismiss, "Dismiss");
        Children = ThingDomain.Items(children, "Children");
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
        Common = ThingDomain.Present(common, "Common");
        Series = ThingDomain.Present(series, "Series");
        Mark = ThingDomain.Present(mark, "Mark");
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
        Common = ThingDomain.Present(common, "Common");
        SlotKind = ThingDomain.Present(slotKind, "SlotKind");
        SlotId = ThingDomain.Present(slotId, "SlotId");
        Width = width;
        Height = height;
    }
}

[MessagePackObject]
public sealed class UseNode : Node
{
    [Key(0)] public NodeCommon Common { get; }
    [Key(1)] public CompositionRef Composition { get; }
    [Key(2)] public IReadOnlyList<Arg> Args { get; }

    public UseNode(NodeCommon common, CompositionRef composition, IReadOnlyList<Arg> args)
    {
        Common = ThingDomain.Present(common, "Common");
        Composition = ThingDomain.Present(composition, "Composition");
        Args = ThingDomain.Items(args, "Args");
    }
}

[Union(0, typeof(ImageFitContain))]
[Union(1, typeof(ImageFitCover))]
[Union(2, typeof(ImageFitFill))]
[Union(3, typeof(ImageFitUnscaled))]
public abstract class ImageFit
{
    internal ImageFit() { }
}

[MessagePackObject]
public sealed class ImageFitContain : ImageFit
{
    public ImageFitContain() { }
}

[MessagePackObject]
public sealed class ImageFitCover : ImageFit
{
    public ImageFitCover() { }
}

[MessagePackObject]
public sealed class ImageFitFill : ImageFit
{
    public ImageFitFill() { }
}

[MessagePackObject]
public sealed class ImageFitUnscaled : ImageFit
{
    public ImageFitUnscaled() { }
}

[Union(0, typeof(InputKindText))]
[Union(1, typeof(InputKindNumber))]
public abstract class InputKind
{
    internal InputKind() { }
}

[MessagePackObject]
public sealed class InputKindText : InputKind
{
    public InputKindText() { }
}

[MessagePackObject]
public sealed class InputKindNumber : InputKind
{
    public InputKindNumber() { }
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
    [Key(0)] public IReadOnlyList<SelectOption> Options { get; }

    public LiteralOptions(IReadOnlyList<SelectOption> options)
    {
        Options = ThingDomain.Items(options, "Options");
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
        Collection = ThingDomain.Present(collection, "Collection");
        ValueMember = ThingDomain.Present(valueMember, "ValueMember");
        LabelMember = ThingDomain.Present(labelMember, "LabelMember");
    }
}

[Union(0, typeof(AnchorViewport))]
[Union(1, typeof(AnchorNode))]
public abstract class Anchor
{
    internal Anchor() { }
}

[MessagePackObject]
public sealed class AnchorViewport : Anchor
{
    public AnchorViewport() { }
}

[MessagePackObject]
public sealed class AnchorNode : Anchor
{
    [Key(0)] public string Node { get; }

    public AnchorNode(string node)
    {
        Node = ThingDomain.Present(node, "Node");
    }
}

[Union(0, typeof(PlotMarkLine))]
[Union(1, typeof(PlotMarkBar))]
[Union(2, typeof(PlotMarkArea))]
public abstract class PlotMark
{
    internal PlotMark() { }
}

[MessagePackObject]
public sealed class PlotMarkLine : PlotMark
{
    public PlotMarkLine() { }
}

[MessagePackObject]
public sealed class PlotMarkBar : PlotMark
{
    public PlotMarkBar() { }
}

[MessagePackObject]
public sealed class PlotMarkArea : PlotMark
{
    public PlotMarkArea() { }
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
        Value = ThingDomain.Present(value, "Value");
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
        Source = ThingDomain.Present(source, "Source");
        Member = ThingDomain.Present(member, "Member");
        Format = format;
    }
}

[MessagePackObject]
public sealed class CollectionArg : ArgValue
{
    [Key(0)] public CollectionSource Source { get; }

    public CollectionArg(CollectionSource source)
    {
        Source = ThingDomain.Present(source, "Source");
    }
}

[MessagePackObject]
public sealed class CommandArg : ArgValue
{
    [Key(0)] public CommandRef Command { get; }

    public CommandArg(CommandRef command)
    {
        Command = ThingDomain.Present(command, "Command");
    }
}

[MessagePackObject]
public sealed class SlotArg : ArgValue
{
    [Key(0)] public IReadOnlyList<Node> Nodes { get; }

    public SlotArg(IReadOnlyList<Node> nodes)
    {
        Nodes = ThingDomain.Items(nodes, "Nodes");
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
}

[MessagePackObject]
public sealed class ParamKindText : ParamKind
{
    public ParamKindText() { }
}

[MessagePackObject]
public sealed class ParamKindNumber : ParamKind
{
    public ParamKindNumber() { }
}

[MessagePackObject]
public sealed class ParamKindBool : ParamKind
{
    public ParamKindBool() { }
}

[MessagePackObject]
public sealed class ParamKindBind : ParamKind
{
    public ParamKindBind() { }
}

[MessagePackObject]
public sealed class ParamKindCollection : ParamKind
{
    public ParamKindCollection() { }
}

[MessagePackObject]
public sealed class ParamKindCommand : ParamKind
{
    public ParamKindCommand() { }
}

[MessagePackObject]
public sealed class ParamKindSlot : ParamKind
{
    public ParamKindSlot() { }
}

[MessagePackObject]
public sealed class NodeCommon
{
    [Key(0)] public string Id { get; }
    [Key(1)] public BoolSource Visible { get; }
    [Key(2)] public TextSource? A11yLabel { get; }

    public NodeCommon(string id, BoolSource visible, TextSource? a11yLabel)
    {
        Id = ThingDomain.Present(id, "Id");
        Visible = ThingDomain.Present(visible, "Visible");
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
        Value = ThingDomain.Present(value, "Value");
        Label = ThingDomain.Present(label, "Label");
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
        Publisher = ThingDomain.Present(publisher, "Publisher");
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
        Name = ThingDomain.Present(name, "Name");
        Value = ThingDomain.Present(value, "Value");
    }
}

[MessagePackObject]
public sealed class ParamDecl
{
    [Key(0)] public string Name { get; }
    [Key(1)] public ParamKind Kind { get; }

    public ParamDecl(string name, ParamKind kind)
    {
        Name = ThingDomain.Present(name, "Name");
        InputKind = ThingDomain.Present(inputKind, "InputKind");
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
    [Key(5)] public IReadOnlyList<CommandDecl> Commands { get; }

    public SurfaceDocument(string providerId, string label, long version, string title, Node root, IReadOnlyList<CommandDecl> commands)
    {
        ProviderId = ThingDomain.Present(providerId, "ProviderId");
        Label = ThingDomain.Segment(label);
        Version = ThingDomain.Version(version);
        Title = ThingDomain.Present(title, "Title");
        Root = ThingDomain.Present(root, "Root");
        Commands = ThingDomain.Items(commands, "Commands");
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
    [Key(3)] public IReadOnlyList<ParamDecl> Params { get; }
    [Key(4)] public Node Body { get; }

    public CompositionDocument(string publisher, string name, long version, IReadOnlyList<ParamDecl> @params, Node body)
    {
        Publisher = ThingDomain.Present(publisher, "Publisher");
        Name = ThingDomain.Segment(name);
        Version = ThingDomain.Version(version);
        Params = ThingDomain.Items(@params, "Params");
        Body = ThingDomain.Present(body, "Body");
    }

    [IgnoreMember] public string RecordKey => ThingKeys.CompositionKey(Publisher, Name, Version);
}
