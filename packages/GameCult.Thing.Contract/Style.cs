using System.Collections.Generic;
using GameCult.Caching;
using MessagePack;

namespace GameCult.Thing.Contract;

[Union(0, typeof(DimensionPx))]
[Union(1, typeof(DimensionPercent))]
[Union(2, typeof(DimensionFr))]
[Union(3, typeof(DimensionAuto))]
[Union(4, typeof(DimensionContent))]
public abstract class Dimension
{
    internal Dimension() { }
    public static Dimension Auto => DimensionAuto.Instance;
    public static Dimension Content => DimensionContent.Instance;
}

[MessagePackObject]
public sealed class DimensionPx : Dimension
{
    [Key(0)] public double Value { get; }

    public DimensionPx(double value)
    {
        Value = value;
    }
}

[MessagePackObject]
public sealed class DimensionPercent : Dimension
{
    [Key(0)] public double Value { get; }

    public DimensionPercent(double value)
    {
        Value = value;
    }
}

[MessagePackObject]
public sealed class DimensionFr : Dimension
{
    [Key(0)] public double Value { get; }

    public DimensionFr(double value)
    {
        Value = value;
    }
}

[MessagePackObject(AllowPrivate = true)]
public sealed class DimensionAuto : Dimension
{
    internal static readonly DimensionAuto Instance = new DimensionAuto();

    [SerializationConstructor] private DimensionAuto() { }
}

[MessagePackObject(AllowPrivate = true)]
public sealed class DimensionContent : Dimension
{
    internal static readonly DimensionContent Instance = new DimensionContent();

    [SerializationConstructor] private DimensionContent() { }
}

[Union(0, typeof(DisplayFlex))]
[Union(1, typeof(DisplayGrid))]
[Union(2, typeof(DisplayBlock))]
public abstract class Display
{
    internal Display() { }
    public static Display Flex => DisplayFlex.Instance;
    public static Display Grid => DisplayGrid.Instance;
    public static Display Block => DisplayBlock.Instance;
}

[MessagePackObject(AllowPrivate = true)]
public sealed class DisplayFlex : Display
{
    internal static readonly DisplayFlex Instance = new DisplayFlex();

    [SerializationConstructor] private DisplayFlex() { }
}

[MessagePackObject(AllowPrivate = true)]
public sealed class DisplayGrid : Display
{
    internal static readonly DisplayGrid Instance = new DisplayGrid();

    [SerializationConstructor] private DisplayGrid() { }
}

[MessagePackObject(AllowPrivate = true)]
public sealed class DisplayBlock : Display
{
    internal static readonly DisplayBlock Instance = new DisplayBlock();

    [SerializationConstructor] private DisplayBlock() { }
}

[Union(0, typeof(DirectionRow))]
[Union(1, typeof(DirectionColumn))]
[Union(2, typeof(DirectionRowReverse))]
[Union(3, typeof(DirectionColumnReverse))]
public abstract class Direction
{
    internal Direction() { }
    public static Direction Row => DirectionRow.Instance;
    public static Direction Column => DirectionColumn.Instance;
    public static Direction RowReverse => DirectionRowReverse.Instance;
    public static Direction ColumnReverse => DirectionColumnReverse.Instance;
}

[MessagePackObject(AllowPrivate = true)]
public sealed class DirectionRow : Direction
{
    internal static readonly DirectionRow Instance = new DirectionRow();

    [SerializationConstructor] private DirectionRow() { }
}

[MessagePackObject(AllowPrivate = true)]
public sealed class DirectionColumn : Direction
{
    internal static readonly DirectionColumn Instance = new DirectionColumn();

    [SerializationConstructor] private DirectionColumn() { }
}

[MessagePackObject(AllowPrivate = true)]
public sealed class DirectionRowReverse : Direction
{
    internal static readonly DirectionRowReverse Instance = new DirectionRowReverse();

    [SerializationConstructor] private DirectionRowReverse() { }
}

[MessagePackObject(AllowPrivate = true)]
public sealed class DirectionColumnReverse : Direction
{
    internal static readonly DirectionColumnReverse Instance = new DirectionColumnReverse();

    [SerializationConstructor] private DirectionColumnReverse() { }
}

[Union(0, typeof(WrapNoWrap))]
[Union(1, typeof(WrapWrap))]
[Union(2, typeof(WrapWrapReverse))]
public abstract class Wrap
{
    internal Wrap() { }
    public static Wrap NoWrap => WrapNoWrap.Instance;
    public static Wrap Wrapped => WrapWrap.Instance;
    public static Wrap WrapReverse => WrapWrapReverse.Instance;
}

[MessagePackObject(AllowPrivate = true)]
public sealed class WrapNoWrap : Wrap
{
    internal static readonly WrapNoWrap Instance = new WrapNoWrap();

    [SerializationConstructor] private WrapNoWrap() { }
}

[MessagePackObject(AllowPrivate = true)]
public sealed class WrapWrap : Wrap
{
    internal static readonly WrapWrap Instance = new WrapWrap();

    [SerializationConstructor] private WrapWrap() { }
}

[MessagePackObject(AllowPrivate = true)]
public sealed class WrapWrapReverse : Wrap
{
    internal static readonly WrapWrapReverse Instance = new WrapWrapReverse();

    [SerializationConstructor] private WrapWrapReverse() { }
}

[Union(0, typeof(PositionRelative))]
[Union(1, typeof(PositionAbsolute))]
public abstract class Position
{
    internal Position() { }
    public static Position Relative => PositionRelative.Instance;
    public static Position Absolute => PositionAbsolute.Instance;
}

[MessagePackObject(AllowPrivate = true)]
public sealed class PositionRelative : Position
{
    internal static readonly PositionRelative Instance = new PositionRelative();

    [SerializationConstructor] private PositionRelative() { }
}

[MessagePackObject(AllowPrivate = true)]
public sealed class PositionAbsolute : Position
{
    internal static readonly PositionAbsolute Instance = new PositionAbsolute();

    [SerializationConstructor] private PositionAbsolute() { }
}

[Union(0, typeof(OverflowVisible))]
[Union(1, typeof(OverflowClip))]
[Union(2, typeof(OverflowScroll))]
public abstract class Overflow
{
    internal Overflow() { }
    public static Overflow Visible => OverflowVisible.Instance;
    public static Overflow Clip => OverflowClip.Instance;
    public static Overflow Scroll => OverflowScroll.Instance;
}

[MessagePackObject(AllowPrivate = true)]
public sealed class OverflowVisible : Overflow
{
    internal static readonly OverflowVisible Instance = new OverflowVisible();

    [SerializationConstructor] private OverflowVisible() { }
}

[MessagePackObject(AllowPrivate = true)]
public sealed class OverflowClip : Overflow
{
    internal static readonly OverflowClip Instance = new OverflowClip();

    [SerializationConstructor] private OverflowClip() { }
}

[MessagePackObject(AllowPrivate = true)]
public sealed class OverflowScroll : Overflow
{
    internal static readonly OverflowScroll Instance = new OverflowScroll();

    [SerializationConstructor] private OverflowScroll() { }
}

[Union(0, typeof(ItemAlignAuto))]
[Union(1, typeof(ItemAlignStart))]
[Union(2, typeof(ItemAlignEnd))]
[Union(3, typeof(ItemAlignCenter))]
[Union(4, typeof(ItemAlignStretch))]
[Union(5, typeof(ItemAlignBaseline))]
public abstract class ItemAlign
{
    internal ItemAlign() { }
    public static ItemAlign Auto => ItemAlignAuto.Instance;
    public static ItemAlign Start => ItemAlignStart.Instance;
    public static ItemAlign End => ItemAlignEnd.Instance;
    public static ItemAlign Center => ItemAlignCenter.Instance;
    public static ItemAlign Stretch => ItemAlignStretch.Instance;
    public static ItemAlign Baseline => ItemAlignBaseline.Instance;
}

[MessagePackObject(AllowPrivate = true)]
public sealed class ItemAlignAuto : ItemAlign
{
    internal static readonly ItemAlignAuto Instance = new ItemAlignAuto();

    [SerializationConstructor] private ItemAlignAuto() { }
}

[MessagePackObject(AllowPrivate = true)]
public sealed class ItemAlignStart : ItemAlign
{
    internal static readonly ItemAlignStart Instance = new ItemAlignStart();

    [SerializationConstructor] private ItemAlignStart() { }
}

[MessagePackObject(AllowPrivate = true)]
public sealed class ItemAlignEnd : ItemAlign
{
    internal static readonly ItemAlignEnd Instance = new ItemAlignEnd();

    [SerializationConstructor] private ItemAlignEnd() { }
}

[MessagePackObject(AllowPrivate = true)]
public sealed class ItemAlignCenter : ItemAlign
{
    internal static readonly ItemAlignCenter Instance = new ItemAlignCenter();

    [SerializationConstructor] private ItemAlignCenter() { }
}

[MessagePackObject(AllowPrivate = true)]
public sealed class ItemAlignStretch : ItemAlign
{
    internal static readonly ItemAlignStretch Instance = new ItemAlignStretch();

    [SerializationConstructor] private ItemAlignStretch() { }
}

[MessagePackObject(AllowPrivate = true)]
public sealed class ItemAlignBaseline : ItemAlign
{
    internal static readonly ItemAlignBaseline Instance = new ItemAlignBaseline();

    [SerializationConstructor] private ItemAlignBaseline() { }
}

[Union(0, typeof(ContentAlignAuto))]
[Union(1, typeof(ContentAlignStart))]
[Union(2, typeof(ContentAlignEnd))]
[Union(3, typeof(ContentAlignCenter))]
[Union(4, typeof(ContentAlignStretch))]
[Union(5, typeof(ContentAlignSpaceBetween))]
[Union(6, typeof(ContentAlignSpaceAround))]
[Union(7, typeof(ContentAlignSpaceEvenly))]
public abstract class ContentAlign
{
    internal ContentAlign() { }
    public static ContentAlign Auto => ContentAlignAuto.Instance;
    public static ContentAlign Start => ContentAlignStart.Instance;
    public static ContentAlign End => ContentAlignEnd.Instance;
    public static ContentAlign Center => ContentAlignCenter.Instance;
    public static ContentAlign Stretch => ContentAlignStretch.Instance;
    public static ContentAlign SpaceBetween => ContentAlignSpaceBetween.Instance;
    public static ContentAlign SpaceAround => ContentAlignSpaceAround.Instance;
    public static ContentAlign SpaceEvenly => ContentAlignSpaceEvenly.Instance;
}

[MessagePackObject(AllowPrivate = true)]
public sealed class ContentAlignAuto : ContentAlign
{
    internal static readonly ContentAlignAuto Instance = new ContentAlignAuto();

    [SerializationConstructor] private ContentAlignAuto() { }
}

[MessagePackObject(AllowPrivate = true)]
public sealed class ContentAlignStart : ContentAlign
{
    internal static readonly ContentAlignStart Instance = new ContentAlignStart();

    [SerializationConstructor] private ContentAlignStart() { }
}

[MessagePackObject(AllowPrivate = true)]
public sealed class ContentAlignEnd : ContentAlign
{
    internal static readonly ContentAlignEnd Instance = new ContentAlignEnd();

    [SerializationConstructor] private ContentAlignEnd() { }
}

[MessagePackObject(AllowPrivate = true)]
public sealed class ContentAlignCenter : ContentAlign
{
    internal static readonly ContentAlignCenter Instance = new ContentAlignCenter();

    [SerializationConstructor] private ContentAlignCenter() { }
}

[MessagePackObject(AllowPrivate = true)]
public sealed class ContentAlignStretch : ContentAlign
{
    internal static readonly ContentAlignStretch Instance = new ContentAlignStretch();

    [SerializationConstructor] private ContentAlignStretch() { }
}

[MessagePackObject(AllowPrivate = true)]
public sealed class ContentAlignSpaceBetween : ContentAlign
{
    internal static readonly ContentAlignSpaceBetween Instance = new ContentAlignSpaceBetween();

    [SerializationConstructor] private ContentAlignSpaceBetween() { }
}

[MessagePackObject(AllowPrivate = true)]
public sealed class ContentAlignSpaceAround : ContentAlign
{
    internal static readonly ContentAlignSpaceAround Instance = new ContentAlignSpaceAround();

    [SerializationConstructor] private ContentAlignSpaceAround() { }
}

[MessagePackObject(AllowPrivate = true)]
public sealed class ContentAlignSpaceEvenly : ContentAlign
{
    internal static readonly ContentAlignSpaceEvenly Instance = new ContentAlignSpaceEvenly();

    [SerializationConstructor] private ContentAlignSpaceEvenly() { }
}

[Union(0, typeof(ThemeToken))]
[Union(1, typeof(Rgba))]
public abstract class ColorRef
{
    internal ColorRef() { }
}

[MessagePackObject]
public sealed class ThemeToken : ColorRef
{
    [Key(0)] public string Name { get; }

    public ThemeToken(string name)
    {
        Name = ThingDomain.Present(name, "Name");
    }
}

[MessagePackObject]
public sealed class Rgba : ColorRef
{
    [Key(0)] public byte R { get; }
    [Key(1)] public byte G { get; }
    [Key(2)] public byte B { get; }
    [Key(3)] public byte A { get; }

    public Rgba(byte r, byte g, byte b, byte a)
    {
        R = r;
        G = g;
        B = b;
        A = a;
    }
}

[Union(0, typeof(RoleGroup))]
[Union(1, typeof(RoleRegion))]
[Union(2, typeof(RoleList))]
[Union(3, typeof(RoleListItem))]
[Union(4, typeof(RoleHeading))]
[Union(5, typeof(RoleDialog))]
[Union(6, typeof(RoleToolbar))]
public abstract class Role
{
    internal Role() { }
    public static Role Group => RoleGroup.Instance;
    public static Role Region => RoleRegion.Instance;
    public static Role List => RoleList.Instance;
    public static Role ListItem => RoleListItem.Instance;
    public static Role Heading => RoleHeading.Instance;
    public static Role Dialog => RoleDialog.Instance;
    public static Role Toolbar => RoleToolbar.Instance;
}

[MessagePackObject(AllowPrivate = true)]
public sealed class RoleGroup : Role
{
    internal static readonly RoleGroup Instance = new RoleGroup();

    [SerializationConstructor] private RoleGroup() { }
}

[MessagePackObject(AllowPrivate = true)]
public sealed class RoleRegion : Role
{
    internal static readonly RoleRegion Instance = new RoleRegion();

    [SerializationConstructor] private RoleRegion() { }
}

[MessagePackObject(AllowPrivate = true)]
public sealed class RoleList : Role
{
    internal static readonly RoleList Instance = new RoleList();

    [SerializationConstructor] private RoleList() { }
}

[MessagePackObject(AllowPrivate = true)]
public sealed class RoleListItem : Role
{
    internal static readonly RoleListItem Instance = new RoleListItem();

    [SerializationConstructor] private RoleListItem() { }
}

[MessagePackObject(AllowPrivate = true)]
public sealed class RoleHeading : Role
{
    internal static readonly RoleHeading Instance = new RoleHeading();

    [SerializationConstructor] private RoleHeading() { }
}

[MessagePackObject(AllowPrivate = true)]
public sealed class RoleDialog : Role
{
    internal static readonly RoleDialog Instance = new RoleDialog();

    [SerializationConstructor] private RoleDialog() { }
}

[MessagePackObject(AllowPrivate = true)]
public sealed class RoleToolbar : Role
{
    internal static readonly RoleToolbar Instance = new RoleToolbar();

    [SerializationConstructor] private RoleToolbar() { }
}

[MessagePackObject]
public sealed class Size2
{
    [Key(0)] public Dimension Width { get; }
    [Key(1)] public Dimension Height { get; }

    public Size2(Dimension width, Dimension height)
    {
        Width = ThingDomain.Present(width, "Width");
        Height = ThingDomain.Present(height, "Height");
    }
}

[MessagePackObject]
public sealed class Edges
{
    [Key(0)] public Dimension Top { get; }
    [Key(1)] public Dimension Right { get; }
    [Key(2)] public Dimension Bottom { get; }
    [Key(3)] public Dimension Left { get; }

    public Edges(Dimension top, Dimension right, Dimension bottom, Dimension left)
    {
        Top = ThingDomain.Present(top, "Top");
        Right = ThingDomain.Present(right, "Right");
        Bottom = ThingDomain.Present(bottom, "Bottom");
        Left = ThingDomain.Present(left, "Left");
    }
}

[MessagePackObject]
public sealed class BoxStyle
{
    [Key(0)] public Display Display { get; }
    [Key(1)] public Direction Direction { get; }
    [Key(2)] public Wrap Wrap { get; }
    [Key(3)] public Size2 Gap { get; }
    [Key(4)] public Edges Padding { get; }
    [Key(5)] public Edges Margin { get; }
    [Key(6)] public Size2 Size { get; }
    [Key(7)] public Size2 MinSize { get; }
    [Key(8)] public Size2 MaxSize { get; }
    [Key(9)] public Position Position { get; }
    [Key(10)] public Edges Inset { get; }
    [Key(11)] public Overflow Overflow { get; }
    [Key(12)] public ItemAlign AlignItems { get; }
    [Key(13)] public ItemAlign AlignSelf { get; }
    [Key(14)] public ContentAlign AlignContent { get; }
    [Key(15)] public ContentAlign JustifyContent { get; }
    [Key(16)] public double Grow { get; }
    [Key(17)] public double Shrink { get; }
    [Key(18)] public Dimension Basis { get; }
    [Key(19)] public IReadOnlyList<Dimension> GridColumns { get; }
    [Key(20)] public IReadOnlyList<Dimension> GridRows { get; }

    public BoxStyle(Display display, Direction direction, Wrap wrap, Size2 gap, Edges padding, Edges margin, Size2 size, Size2 minSize, Size2 maxSize, Position position, Edges inset, Overflow overflow, ItemAlign alignItems, ItemAlign alignSelf, ContentAlign alignContent, ContentAlign justifyContent, double grow, double shrink, Dimension basis, IReadOnlyList<Dimension> gridColumns, IReadOnlyList<Dimension> gridRows)
    {
        Display = ThingDomain.Present(display, "Display");
        Direction = ThingDomain.Present(direction, "Direction");
        Wrap = ThingDomain.Present(wrap, "Wrap");
        Gap = ThingDomain.Present(gap, "Gap");
        Padding = ThingDomain.Present(padding, "Padding");
        Margin = ThingDomain.Present(margin, "Margin");
        Size = ThingDomain.Present(size, "Size");
        MinSize = ThingDomain.Present(minSize, "MinSize");
        MaxSize = ThingDomain.Present(maxSize, "MaxSize");
        Position = ThingDomain.Present(position, "Position");
        Inset = ThingDomain.Present(inset, "Inset");
        Overflow = ThingDomain.Present(overflow, "Overflow");
        AlignItems = ThingDomain.Present(alignItems, "AlignItems");
        AlignSelf = ThingDomain.Present(alignSelf, "AlignSelf");
        AlignContent = ThingDomain.Present(alignContent, "AlignContent");
        JustifyContent = ThingDomain.Present(justifyContent, "JustifyContent");
        Grow = grow;
        Shrink = shrink;
        Basis = ThingDomain.Present(basis, "Basis");
        GridColumns = ThingDomain.Items(gridColumns, "GridColumns");
        GridRows = ThingDomain.Items(gridRows, "GridRows");
    }
}

[MessagePackObject]
public sealed class Border
{
    [Key(0)] public ColorRef Color { get; }
    [Key(1)] public double Width { get; }

    public Border(ColorRef color, double width)
    {
        Color = ThingDomain.Present(color, "Color");
        Width = width;
    }
}

[MessagePackObject]
public sealed class Paint
{
    [Key(0)] public ColorRef? Background { get; }
    [Key(1)] public Border? Border { get; }
    [Key(2)] public double Radius { get; }

    public Paint(ColorRef? background, Border? border, double radius)
    {
        Background = background;
        Border = border;
        Radius = radius;
    }
}
