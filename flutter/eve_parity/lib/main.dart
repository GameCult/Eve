import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

void main() {
  runApp(const EveParityApp());
}

class EveParityApp extends StatefulWidget {
  const EveParityApp({super.key, this.assetPath = 'assets/current-surface.json'});

  final String assetPath;

  @override
  State<EveParityApp> createState() => _EveParityAppState();
}

class _EveParityAppState extends State<EveParityApp> {
  late Future<EveSurfaceState> surface;

  @override
  void initState() {
    super.initState();
    surface = EveSurfaceState.load(widget.assetPath);
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      home: FutureBuilder<EveSurfaceState>(
        future: surface,
        builder: (context, snapshot) {
          final state = snapshot.data;
          final tokens = state?.tokens ?? EveTokens.defaults;
          return Scaffold(
            backgroundColor: tokens.background,
            body: SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: snapshot.hasError
                    ? Text(
                        'Eve surface load failed\n${snapshot.error}',
                        style: const TextStyle(color: Color(0xFFFFB84F), fontFamily: 'monospace'),
                      )
                    : state == null
                        ? const SizedBox.shrink()
                        : SingleChildScrollView(child: EveSurfaceView(state: state)),
              ),
            ),
          );
        },
      ),
    );
  }
}

class EveSurfaceState {
  EveSurfaceState({
    required this.providerId,
    required this.title,
    required this.root,
    required this.tokens,
    required this.controlSkins,
    required this.values,
  });

  final String providerId;
  final String title;
  final EveNode root;
  final EveTokens tokens;
  final Map<String, List<EveNode>> controlSkins;
  final Map<String, dynamic> values;

  static Future<EveSurfaceState> load(String assetPath) async {
    final raw = await rootBundle.loadString(assetPath);
    final json = jsonDecode(raw) as Map<String, dynamic>;
    final surface = json['surface'] as Map<String, dynamic>;
    final styles = (surface['styles'] as Map<String, dynamic>?) ?? const {};
    final skins = <String, List<EveNode>>{};
    final rawSkins = (styles['controlSkins'] as Map<String, dynamic>?) ?? const {};
    for (final entry in rawSkins.entries) {
      final skin = entry.value as Map<String, dynamic>;
      skins[entry.key] = ((skin['children'] as List<dynamic>?) ?? const [])
          .map((child) => EveNode.fromJson(child as Map<String, dynamic>))
          .toList();
    }
    return EveSurfaceState(
      providerId: (json['providerId'] ?? '').toString(),
      title: (json['title'] ?? '').toString(),
      root: EveNode.fromJson(surface['root'] as Map<String, dynamic>),
      tokens: EveTokens.fromJson((styles['tokens'] as Map<String, dynamic>?) ?? const {}),
      controlSkins: skins,
      values: (json['values'] as Map<String, dynamic>?) ?? const {},
    );
  }
}

class EveNode {
  EveNode({
    required this.id,
    required this.kind,
    required this.props,
    required this.layout,
    required this.children,
  });

  final String id;
  final String kind;
  final Map<String, dynamic> props;
  final Map<String, dynamic> layout;
  final List<EveNode> children;

  factory EveNode.fromJson(Map<String, dynamic> json) {
    return EveNode(
      id: (json['id'] ?? '').toString(),
      kind: (json['kind'] ?? 'panel').toString(),
      props: (json['props'] as Map<String, dynamic>?) ?? const {},
      layout: (json['layout'] as Map<String, dynamic>?) ?? const {},
      children: ((json['children'] as List<dynamic>?) ?? const [])
          .map((child) => EveNode.fromJson(child as Map<String, dynamic>))
          .toList(),
    );
  }
}

class EveTokens {
  const EveTokens({
    required this.background,
    required this.panel,
    required this.panelAlt,
    required this.panelInset,
    required this.border,
    required this.text,
    required this.muted,
    required this.accent,
  });

  final Color background;
  final Color panel;
  final Color panelAlt;
  final Color panelInset;
  final Color border;
  final Color text;
  final Color muted;
  final Color accent;

  static const defaults = EveTokens(
    background: Color(0xFF020909),
    panel: Color(0xFF071918),
    panelAlt: Color(0xFF15151D),
    panelInset: Color(0x57000000),
    border: Color(0x4767F0E4),
    text: Color(0xFFE7F1F1),
    muted: Color(0xFF8BA5A3),
    accent: Color(0xFFFFB84F),
  );

  factory EveTokens.fromJson(Map<String, dynamic> json) {
    return EveTokens(
      background: _color(json['colorBackground'], defaults.background),
      panel: _color(json['colorPanel'], defaults.panel),
      panelAlt: _color(json['colorPanelAlt'], defaults.panelAlt),
      panelInset: _color(json['colorPanelInset'], defaults.panelInset),
      border: _color(json['colorPanelBorder'], defaults.border),
      text: _color(json['colorText'], defaults.text),
      muted: _color(json['colorMuted'], defaults.muted),
      accent: _color(json['colorAccent'], defaults.accent),
    );
  }

  static Color _color(Object? value, Color fallback) {
    if (value is! String) return fallback;
    final hex = value.trim();
    if (!hex.startsWith('#')) return fallback;
    final body = hex.substring(1);
    if (body.length == 6) return Color(int.parse('ff$body', radix: 16));
    if (body.length == 8) return Color(int.parse(body, radix: 16));
    return fallback;
  }
}

class EveSurfaceView extends StatelessWidget {
  const EveSurfaceView({required this.state, super.key});

  final EveSurfaceState state;

  @override
  Widget build(BuildContext context) {
    return EveNodeView(state: state, node: state.root);
  }
}

class EveNodeView extends StatelessWidget {
  const EveNodeView({required this.state, required this.node, super.key});

  final EveSurfaceState state;
  final EveNode node;

  @override
  Widget build(BuildContext context) {
    switch (node.kind) {
      case 'surface':
        return _surface();
      case 'partition':
        return _partition();
      case 'pane':
      case 'panel':
        return _pane();
      case 'card':
      case 'card.external':
        return _card();
      case 'label':
      case 'text':
      case 'text.title':
      case 'text.dialogue':
        return _text();
      case 'control.slider':
        return EveSlider(state: state, node: node);
      case 'control.button':
        return _button();
      case 'image.preview':
        return _imagePreview();
      case 'canvas.preview':
      case 'canvas.editor':
        return _canvasPlaceholder(editor: node.kind == 'canvas.editor');
      case 'status.stage':
        return _statusStage();
      case 'input.file':
      case 'dropzone':
        return _button();
      case 'input.number':
      case 'input.select':
      case 'control.range':
        return _field();
      case 'control.toggle':
        return _toggle();
      case 'color.swatch':
        return _swatch();
      case 'vn.stage':
        return _vnStage();
      case 'image.background':
        return _background();
      case 'embed.norn':
        return _norn();
      case 'embed.tex':
        return _tex();
      case 'panel.dialogue':
        return _dialogue();
      case 'rail.actions':
        return _actions();
      default:
        return _fallback();
    }
  }

  Widget _vnStage() {
    final background = node.children.where((child) => child.kind == 'image.background').firstOrNull;
    final sceneChildren = node.children.where((child) {
      return child.kind != 'image.background' && child.kind != 'panel.dialogue' && child.kind != 'rail.actions';
    }).toList();
    final dialogue = node.children.where((child) => child.kind == 'panel.dialogue').firstOrNull;
    final actions = node.children.where((child) => child.kind == 'rail.actions').firstOrNull;

    return LayoutBuilder(
      builder: (context, constraints) {
        final width = constraints.maxWidth;
        final height = constraints.maxHeight.isFinite ? constraints.maxHeight : width * 0.56;
        return SizedBox(
          width: width,
          height: height.clamp(520, 900),
          child: Stack(
            children: [
              Positioned.fill(
                child: background == null
                    ? DecoratedBox(decoration: BoxDecoration(color: state.tokens.background))
                    : EveNodeView(state: state, node: background),
              ),
              for (final child in sceneChildren) _stageOverlay(child),
              if (dialogue != null)
                Positioned(
                  left: 28,
                  right: 28,
                  bottom: actions == null ? 24 : 96,
                  child: EveNodeView(state: state, node: dialogue),
                ),
              if (actions != null)
                Positioned(left: 28, right: 28, bottom: 24, child: EveNodeView(state: state, node: actions)),
            ],
          ),
        );
      },
    );
  }

  Positioned _stageOverlay(EveNode child) {
    if (child.kind == 'layer.embedded-surfaces' || child.kind == 'layer.cards') {
      return Positioned.fill(
        child: IgnorePointer(
          child: Stack(children: [for (final grandchild in child.children) _stageOverlay(grandchild)]),
        ),
      );
    }
    final placement = _map(child.props['placement']);
    final anchor = placement['anchor']?.toString();
    if (child.kind == 'embed.norn' || anchor == 'whiteboard') {
      return Positioned(left: 54, top: 46, width: 520, height: 310, child: EveNodeView(state: state, node: child));
    }
    if (child.kind == 'embed.tex' || anchor == 'whiteboard-equation') {
      return Positioned(left: 96, top: 350, width: 500, height: 94, child: EveNodeView(state: state, node: child));
    }
    return Positioned(right: 32, top: 52, width: 300, child: EveNodeView(state: state, node: child));
  }

  Widget _background() {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: state.tokens.background,
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [state.tokens.panelAlt, state.tokens.background, const Color(0xFF10161F)],
        ),
      ),
      child: Stack(
        children: [
          Positioned.fill(
            child: CustomPaint(painter: EveGridPainter(color: state.tokens.accent.withValues(alpha: 0.10))),
          ),
          Positioned(
            left: 28,
            top: 24,
            child: Text(
              node.props['label']?.toString() ?? 'Scene',
              style: TextStyle(
                color: state.tokens.muted,
                fontFamily: 'EveParity',
                fontSize: 12,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _norn() {
    final graph = _map(node.props['graph']);
    final nodes = (graph['nodes'] as List<dynamic>?) ?? const [];
    final edges = (graph['edges'] as List<dynamic>?) ?? const [];
    return DecoratedBox(
      decoration: BoxDecoration(
        color: state.tokens.panel.withValues(alpha: 0.82),
        border: Border.all(color: state.tokens.border),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: CustomPaint(
          painter: EveNornPainter(nodes: nodes, edges: edges, tokens: state.tokens),
          child: const SizedBox.expand(),
        ),
      ),
    );
  }

  Widget _tex() {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: state.tokens.panel.withValues(alpha: 0.88),
        border: Border.all(color: state.tokens.border),
        borderRadius: BorderRadius.circular(5),
      ),
      child: Padding(
        padding: const EdgeInsets.all(10),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (node.props['label'] != null)
              Text(
                node.props['label'].toString().toUpperCase(),
                style: TextStyle(
                  color: state.tokens.accent,
                  fontFamily: 'EveParity',
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                ),
              ),
            Text(
              node.props['source']?.toString() ?? '',
              style: TextStyle(color: state.tokens.text, fontFamily: 'EveParity', fontSize: 18),
            ),
          ],
        ),
      ),
    );
  }

  Widget _dialogue() {
    final speaker = node.props['speaker']?.toString() ?? '';
    final text = node.props['text']?.toString() ?? '';
    return DecoratedBox(
      decoration: BoxDecoration(
        color: state.tokens.panel.withValues(alpha: 0.94),
        border: Border.all(color: state.tokens.border),
        borderRadius: BorderRadius.circular(8),
        boxShadow: const [BoxShadow(color: Color(0x8A000000), blurRadius: 24, offset: Offset(0, 10))],
      ),
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              speaker,
              style: TextStyle(
                color: state.tokens.accent,
                fontFamily: 'EveParity',
                fontSize: 15,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 8),
            Text(text, style: TextStyle(color: state.tokens.text, fontFamily: 'EveParity', fontSize: 20)),
          ],
        ),
      ),
    );
  }

  Widget _actions() {
    return Row(
      children: [
        for (var index = 0; index < node.children.length; index += 1) ...[
          Expanded(child: EveNodeView(state: state, node: node.children[index])),
          if (index != node.children.length - 1) const SizedBox(width: 10),
        ],
      ],
    );
  }

  Widget _button() {
    final label = node.props['label']?.toString() ?? node.props['text']?.toString() ?? '';
    return DecoratedBox(
      decoration: BoxDecoration(
        color: state.tokens.accent.withValues(alpha: 0.17),
        border: Border.all(color: state.tokens.accent.withValues(alpha: 0.64)),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        child: Text(
          label,
          textAlign: TextAlign.center,
          style: TextStyle(
            color: state.tokens.text,
            fontFamily: 'EveParity',
            fontSize: 14,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
    );
  }

  Widget _imagePreview() {
    final label = node.props['label']?.toString() ?? 'Image';
    final assetPath = _previewAssetPath(node.props['src']);
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        AspectRatio(
          aspectRatio: 1,
          child: DecoratedBox(
            decoration: BoxDecoration(
              color: state.tokens.panelInset,
              border: Border.all(color: state.tokens.border, width: 2),
            ),
            child: Stack(
              children: [
                Positioned.fill(child: CustomPaint(painter: EveGridPainter(color: state.tokens.accent.withValues(alpha: 0.10)))),
                if (assetPath != null)
                  Positioned.fill(
                    child: Image.asset(assetPath, fit: BoxFit.cover, filterQuality: FilterQuality.none),
                  )
                else
                  Center(
                    child: Padding(
                      padding: const EdgeInsets.all(10),
                      child: Text(
                        label,
                        textAlign: TextAlign.center,
                        style: TextStyle(color: state.tokens.muted, fontFamily: 'EveParity', fontSize: 12),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 8),
        Text(label, style: TextStyle(color: state.tokens.muted, fontFamily: 'EveParity', fontSize: 12)),
      ],
    );
  }

  Widget _canvasPlaceholder({required bool editor}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          node.props['label']?.toString() ?? 'Canvas',
          style: TextStyle(color: state.tokens.accent, fontFamily: 'EveParity', fontSize: 12, fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 8),
        SizedBox(
          height: editor ? 280 : 170,
          width: double.infinity,
          child: DecoratedBox(
            decoration: BoxDecoration(
              color: editor ? const Color(0xFF142033) : state.tokens.panelInset,
              border: Border.all(color: state.tokens.border, width: 2),
            ),
            child: Stack(
              children: [
                Positioned.fill(child: CustomPaint(painter: EveGridPainter(color: state.tokens.accent.withValues(alpha: editor ? 0.18 : 0.08)))),
                Center(
                  child: Text(
                    node.props['state']?.toString() ?? '',
                    style: TextStyle(color: state.tokens.muted, fontFamily: 'EveParity', fontSize: 12),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _statusStage() {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: state.tokens.panelAlt,
        border: Border.all(color: state.tokens.border, width: 2),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(node.props['label']?.toString() ?? 'Status', style: TextStyle(color: state.tokens.accent, fontFamily: 'EveParity', fontSize: 12, fontWeight: FontWeight.w700)),
            const SizedBox(height: 6),
            Text(node.props['stage']?.toString() ?? '', style: TextStyle(color: state.tokens.text, fontFamily: 'EveParity', fontSize: 15, fontWeight: FontWeight.w700)),
            const SizedBox(height: 4),
            Text(node.props['detail']?.toString() ?? '', style: TextStyle(color: state.tokens.muted, fontFamily: 'EveParity', fontSize: 12)),
          ],
        ),
      ),
    );
  }

  Widget _field() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(node.props['label']?.toString() ?? '', style: TextStyle(color: state.tokens.accent, fontFamily: 'EveParity', fontSize: 11, fontWeight: FontWeight.w700)),
        const SizedBox(height: 4),
        DecoratedBox(
          decoration: BoxDecoration(color: state.tokens.panelInset, border: Border.all(color: state.tokens.border)),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
            child: Text(node.props['value']?.toString() ?? '', style: TextStyle(color: state.tokens.text, fontFamily: 'EveParity', fontSize: 13)),
          ),
        ),
      ],
    );
  }

  Widget _toggle() {
    return DecoratedBox(
      decoration: BoxDecoration(color: state.tokens.panelInset, border: Border.all(color: state.tokens.border)),
      child: Padding(
        padding: const EdgeInsets.all(8),
        child: Text(
          '${node.props['label'] ?? 'Toggle'}: ${node.props['value'] == true ? 'on' : 'off'}',
          style: TextStyle(color: state.tokens.text, fontFamily: 'EveParity', fontSize: 12),
        ),
      ),
    );
  }

  Widget _swatch() {
    return Container(
      width: 38,
      height: 38,
      decoration: BoxDecoration(
        color: _parseColor(node.props['value']) ?? state.tokens.text,
        border: Border.all(color: state.tokens.accent, width: 2),
      ),
    );
  }

  Widget _surface() {
    final padding = _number(node.layout['padding'] ?? node.props['padding'], 0);
    final direction = node.layout['direction']?.toString();
    return Padding(
      padding: EdgeInsets.all(padding),
      child: LayoutBuilder(
        builder: (context, constraints) {
          if (direction == 'vertical') {
            return _children(axis: Axis.vertical, maxWidth: 1280);
          }
          if (direction == 'horizontal') {
            return _children(axis: Axis.horizontal, maxWidth: 1280);
          }
          if (constraints.maxWidth >= 900 && node.children.length > 1) {
            return _children(axis: Axis.horizontal, maxWidth: 1280);
          }
          return _children(axis: Axis.vertical, maxWidth: 1180);
        },
      ),
    );
  }

  Widget _partition() {
    final split = (node.props['split'] ?? _layoutDirection()).toString();
    final gap = _number(node.props['gap'] ?? node.layout['gap'], 0);
    final padding = _number(node.props['padding'] ?? node.layout['padding'], 0);
    final body = _children(axis: split == 'x' ? Axis.horizontal : Axis.vertical);
    return Padding(
      padding: EdgeInsets.all(padding),
      child: split == 'x'
          ? LayoutBuilder(
              builder: (context, constraints) {
                if (constraints.maxWidth < 520 && node.props['role'] == 'inspector.row') {
                  return _column(gap);
                }
                return body;
              },
            )
          : body,
    );
  }

  Widget _pane() {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: state.tokens.panel,
        border: Border.all(color: state.tokens.border),
        borderRadius: BorderRadius.circular(6),
        boxShadow: const [
          BoxShadow(color: Color(0x59000000), blurRadius: 26, offset: Offset(0, 12)),
        ],
      ),
      child: Padding(
        padding: EdgeInsets.all(_number(node.props['padding'], 12)),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (node.props['title'] != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Text(
                  node.props['title'].toString().toUpperCase(),
                  style: TextStyle(
                    color: state.tokens.muted,
                    fontFamily: 'EveParity',
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ..._spacedChildren(Axis.vertical, _number(node.props['gap'], 0)),
          ],
        ),
      ),
    );
  }

  Widget _card() {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: state.tokens.panelAlt,
        border: Border.all(color: const Color(0x10FFFFFF)),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Padding(
        padding: const EdgeInsets.all(10),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (node.props['title'] != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Text(
                  node.props['title'].toString(),
                  style: TextStyle(
                    color: state.tokens.muted,
                    fontFamily: 'EveParity',
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            _children(axis: Axis.vertical),
          ],
        ),
      ),
    );
  }

  Widget _text() {
    final bind = node.props['bind']?.toString();
    final value = bind == null ? node.props['text'] : state.values[bind];
    final text = '${node.props['prefix'] ?? ''}${value ?? ''}${node.props['suffix'] ?? ''}';
    return Text(
      node.kind == 'label' ? text.toUpperCase() : text,
      style: TextStyle(
        color: node.kind == 'label' ? state.tokens.accent : state.tokens.text,
        fontFamily: 'EveParity',
        fontSize: node.kind == 'text.title' ? 18 : 13,
        fontWeight: node.kind == 'label' ? FontWeight.w700 : FontWeight.w500,
      ),
    );
  }

  Widget _fallback() {
    return node.children.isEmpty ? const SizedBox.shrink() : _children(axis: Axis.vertical);
  }

  Widget _children({required Axis axis, double? maxWidth}) {
    final gap = _number(node.props['gap'], 0);
    final childWidgets = _spacedChildren(axis, gap);
    final content = axis == Axis.horizontal
        ? Row(crossAxisAlignment: CrossAxisAlignment.center, children: childWidgets)
        : Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: childWidgets);
    final constrained = maxWidth == null
        ? content
        : Align(
            alignment: Alignment.topLeft,
            child: ConstrainedBox(constraints: BoxConstraints(maxWidth: maxWidth), child: content),
          );
    return constrained;
  }

  Widget _column(double gap) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: _spacedChildren(Axis.vertical, gap),
    );
  }

  List<Widget> _spacedChildren(Axis axis, double gap) {
    final widgets = <Widget>[];
    for (var index = 0; index < node.children.length; index += 1) {
      final child = node.children[index];
      Widget view = EveNodeView(state: state, node: child);
      if (axis == Axis.horizontal && _isFlexible(child)) {
        view = Expanded(child: view);
      }
      widgets.add(view);
      if (gap > 0 && index != node.children.length - 1) {
        widgets.add(axis == Axis.horizontal ? SizedBox(width: gap) : SizedBox(height: gap));
      }
    }
    return widgets;
  }

  bool _isFlexible(EveNode child) {
    final size = child.props['size']?.toString();
    return size == null || size.endsWith('fr');
  }

  String _layoutDirection() {
    final direction = node.layout['direction']?.toString();
    if (direction == 'horizontal') {
      return 'x';
    }
    return 'y';
  }

  Map<String, dynamic> _map(Object? value) => value is Map<String, dynamic> ? value : const {};

  Color? _parseColor(Object? value) {
    if (value is! String || !value.startsWith('#')) return null;
    final body = value.substring(1);
    if (body.length == 8) return Color(int.parse(body, radix: 16));
    if (body.length == 6) return Color(int.parse('ff$body', radix: 16));
    return null;
  }

  String? _previewAssetPath(Object? source) {
    final src = source?.toString() ?? '';
    if (src.endsWith('/character-input.png')) return 'assets/repixelizer/character-input.png';
    if (src.endsWith('/character-repixelized.png')) return 'assets/repixelizer/character-repixelized.png';
    return null;
  }
}

class EveGridPainter extends CustomPainter {
  EveGridPainter({required this.color});

  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = color;
    for (var x = 0.0; x < size.width; x += 32) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), paint);
    }
    for (var y = 0.0; y < size.height; y += 32) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), paint);
    }
  }

  @override
  bool shouldRepaint(EveGridPainter oldDelegate) => oldDelegate.color != color;
}

class EveNornPainter extends CustomPainter {
  EveNornPainter({required this.nodes, required this.edges, required this.tokens});

  final List<dynamic> nodes;
  final List<dynamic> edges;
  final EveTokens tokens;

  @override
  void paint(Canvas canvas, Size size) {
    final nodeById = <String, Offset>{};
    for (final raw in nodes) {
      if (raw is! Map<String, dynamic>) continue;
      final id = raw['id']?.toString();
      if (id == null) continue;
      nodeById[id] = Offset(_number(raw['x'], 0.5) * size.width, _number(raw['y'], 0.5) * size.height);
    }
    final edgePaint = Paint()
      ..color = tokens.muted.withValues(alpha: 0.5)
      ..strokeWidth = 2;
    for (final raw in edges) {
      if (raw is! Map<String, dynamic>) continue;
      final source = nodeById[raw['source']?.toString()];
      final target = nodeById[raw['target']?.toString()];
      if (source != null && target != null) {
        canvas.drawLine(source, target, edgePaint);
      }
    }
    for (final raw in nodes) {
      if (raw is! Map<String, dynamic>) continue;
      final id = raw['id']?.toString();
      final center = id == null ? null : nodeById[id];
      if (center == null) continue;
      final current = raw['current'] == true;
      canvas.drawCircle(center, current ? 24 : 20, Paint()..color = current ? tokens.accent : tokens.panelAlt);
      canvas.drawCircle(
        center,
        current ? 24 : 20,
        Paint()
          ..color = current ? tokens.accent : tokens.border
          ..style = PaintingStyle.stroke
          ..strokeWidth = 2,
      );
      final label = raw['label']?.toString() ?? id;
      final paragraph = TextPainter(
        text: TextSpan(
          text: label,
          style: TextStyle(color: tokens.text, fontFamily: 'EveParity', fontSize: 13, fontWeight: FontWeight.w700),
        ),
        textDirection: TextDirection.ltr,
      )..layout(maxWidth: 100);
      paragraph.paint(canvas, center + Offset(-paragraph.width / 2, 30));
    }
  }

  @override
  bool shouldRepaint(EveNornPainter oldDelegate) => oldDelegate.nodes != nodes || oldDelegate.edges != edges;
}

class EveSlider extends StatelessWidget {
  const EveSlider({required this.state, required this.node, super.key});

  final EveSurfaceState state;
  final EveNode node;

  @override
  Widget build(BuildContext context) {
    final bind = node.props['bind']?.toString();
    final min = _number(node.props['min'], 0);
    final max = _number(node.props['max'], 1);
    final rawValue = bind == null ? node.props['value'] : state.values[bind];
    final value = _number(rawValue, min).clamp(min, max);
    final percent = max == min ? 0.0 : ((value - min) / (max - min)).clamp(0.0, 1.0);
    final skin = state.controlSkins[node.props['skin']?.toString()] ?? const [];
    final box = skin.where((part) => part.kind == 'control.box').firstOrNull?.props ?? const {};
    return CustomPaint(
      painter: EveSliderPainter(
        value: percent,
        tokens: state.tokens,
        skin: skin,
      ),
      child: SizedBox(
        height: _number(box['height'], 22).clamp(18, 36),
        width: double.infinity,
      ),
    );
  }
}

class EveSliderPainter extends CustomPainter {
  EveSliderPainter({required this.value, required this.tokens, required this.skin});

  final double value;
  final EveTokens tokens;
  final List<EveNode> skin;

  @override
  void paint(Canvas canvas, Size size) {
    final centerY = size.height / 2;
    final trackHeight = _partSize('track', 1, 6);
    final thumbSize = _partSize('thumb', 0, 12);
    final track = RRect.fromRectAndRadius(
      Rect.fromLTWH(0, centerY - trackHeight / 2, size.width, trackHeight),
      Radius.circular(_partRadius('track', 2)),
    );
    final fill = RRect.fromRectAndRadius(
      Rect.fromLTWH(0, centerY - trackHeight / 2, size.width * value, trackHeight),
      Radius.circular(_partRadius('fill', 2)),
    );

    canvas.drawRRect(track, Paint()..color = tokens.panelInset);
    canvas.drawRRect(fill, Paint()..color = tokens.accent);
    final thumbCenter = Offset(size.width * value, centerY);
    canvas.drawCircle(
      thumbCenter,
      thumbSize / 2 + _partBleed('thumb', 0),
      Paint()
        ..color = tokens.accent.withValues(alpha: 0.35)
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 5),
    );
    canvas.drawCircle(thumbCenter, thumbSize / 2, Paint()..color = tokens.accent);
  }

  double _partSize(String name, int index, double fallback) {
    final part = _part(name);
    final size = part?['size'];
    if (size is List && size.length > index) return _number(size[index], fallback);
    return fallback;
  }

  double _partRadius(String name, double fallback) => _number(_part(name)?['radius'], fallback);
  double _partBleed(String name, double fallback) => _number(_part(name)?['bleed'], fallback);

  Map<String, dynamic>? _part(String name) {
    for (final node in skin) {
      if (node.kind == 'control.part' && node.props['name'] == name) return node.props;
    }
    return null;
  }

  @override
  bool shouldRepaint(covariant EveSliderPainter oldDelegate) {
    return oldDelegate.value != value || oldDelegate.tokens != tokens || oldDelegate.skin != skin;
  }
}

double _number(Object? value, double fallback) {
  if (value is num) return value.toDouble();
  if (value is String) return double.tryParse(value) ?? fallback;
  return fallback;
}
