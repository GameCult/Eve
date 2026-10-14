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

[MessagePackObject]
public sealed class DimensionAuto : Dimension
{
    public DimensionAuto() { }
}

[MessagePackObject]
public sealed class DimensionContent : Dimension
{
    public DimensionContent() { }
}

[Union(0, typeof(DisplayFlex))]
[Union(1, typeof(DisplayGrid))]
[Union(2, typeof(DisplayBlock))]
public abstract class Display
{
    internal Display() { }
}

[MessagePackObject]
public sealed class DisplayFlex : Display
{
    public DisplayFlex() { }
}

[MessagePackObject]
public sealed class DisplayGrid : Display
{
    public DisplayGrid() { }
}

[MessagePackObject]
public sealed class DisplayBlock : Display
{
    public DisplayBlock() { }
}

[Union(0, typeof(DirectionRow))]
[Union(1, typeof(DirectionColumn))]
[Union(2, typeof(DirectionRowReverse))]
[Union(3, typeof(DirectionColumnReverse))]
public abstract class Direction
{
    internal Direction() { }
}

[MessagePackObject]
public sealed class DirectionRow : Direction
{
    public DirectionRow() { }
}

[MessagePackObject]
public sealed class DirectionColumn : Direction
{
    public DirectionColumn() { }
}

[MessagePackObject]
public sealed class DirectionRowReverse : Direction
{
    public DirectionRowReverse() { }
}

[MessagePackObject]
public sealed class DirectionColumnReverse : Direction
{
    public DirectionColumnReverse() { }
}

[Union(0, typeof(WrapNoWrap))]
[Union(1, typeof(WrapWrap))]
[Union(2, typeof(WrapWrapReverse))]
public abstract class Wrap
{
    internal Wrap() { }
}

[MessagePackObject]
public sealed class WrapNoWrap : Wrap
{
    public WrapNoWrap() { }
}

[MessagePackObject]
public sealed class WrapWrap : Wrap
{
    public WrapWrap() { }
}

[MessagePackObject]
public sealed class WrapWrapReverse : Wrap
{
    public WrapWrapReverse() { }
}

[Union(0, typeof(PositionRelative))]
[Union(1, typeof(PositionAbsolute))]
public abstract class Position
{
    internal Position() { }
}

[MessagePackObject]
public sealed class PositionRelative : Position
{
    public PositionRelative() { }
}

[MessagePackObject]
public sealed class PositionAbsolute : Position
{
    public PositionAbsolute() { }
}

[Union(0, typeof(OverflowVisible))]
[Union(1, typeof(OverflowClip))]
[Union(2, typeof(OverflowScroll))]
public abstract class Overflow
{
    internal Overflow() { }
}

[MessagePackObject]
public sealed class OverflowVisible : Overflow
{
    public OverflowVisible() { }
}

[MessagePackObject]
public sealed class OverflowClip : Overflow
{
    public OverflowClip() { }
}

[MessagePackObject]
public sealed class OverflowScroll : Overflow
{
    public OverflowScroll() { }
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
}

[MessagePackObject]
public sealed class ItemAlignAuto : ItemAlign
{
    public ItemAlignAuto() { }
}

[MessagePackObject]
public sealed class ItemAlignStart : ItemAlign
{
    public ItemAlignStart() { }
}

[MessagePackObject]
public sealed class ItemAlignEnd : ItemAlign
{
    public ItemAlignEnd() { }
}

[MessagePackObject]
public sealed class ItemAlignCenter : ItemAlign
{
    public ItemAlignCenter() { }
}

[MessagePackObject]
public sealed class ItemAlignStretch : ItemAlign
{
    public ItemAlignStretch() { }
}

[MessagePackObject]
public sealed class ItemAlignBaseline : ItemAlign
{
    public ItemAlignBaseline() { }
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
}

[MessagePackObject]
public sealed class ContentAlignAuto : ContentAlign
{
    public ContentAlignAuto() { }
}

[MessagePackObject]
public sealed class ContentAlignStart : ContentAlign
{
    public ContentAlignStart() { }
}

[MessagePackObject]
public sealed class ContentAlignEnd : ContentAlign
{
    public ContentAlignEnd() { }
}

[MessagePackObject]
public sealed class ContentAlignCenter : ContentAlign
{
    public ContentAlignCenter() { }
}

[MessagePackObject]
public sealed class ContentAlignStretch : ContentAlign
{
    public ContentAlignStretch() { }
}

[MessagePackObject]
public sealed class ContentAlignSpaceBetween : ContentAlign
{
    public ContentAlignSpaceBetween() { }
}

[MessagePackObject]
public sealed class ContentAlignSpaceAround : ContentAlign
{
    public ContentAlignSpaceAround() { }
}

[MessagePackObject]
public sealed class ContentAlignSpaceEvenly : ContentAlign
{
    public ContentAlignSpaceEvenly() { }
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
}

[MessagePackObject]
public sealed class RoleGroup : Role
{
    public RoleGroup() { }
}

[MessagePackObject]
public sealed class RoleRegion : Role
{
    public RoleRegion() { }
}

[MessagePackObject]
public sealed class RoleList : Role
{
    public RoleList() { }
}

[MessagePackObject]
public sealed class RoleListItem : Role
{
    public RoleListItem() { }
}

[MessagePackObject]
public sealed class RoleHeading : Role
{
    public RoleHeading() { }
}

[MessagePackObject]
public sealed class RoleDialog : Role
{
    public RoleDialog() { }
}

[MessagePackObject]
public sealed class RoleToolbar : Role
{
    public RoleToolbar() { }
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
