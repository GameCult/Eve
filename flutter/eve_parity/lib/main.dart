import 'package:flutter/material.dart';

void main() {
  runApp(const EveParityApp());
}

class EveParityApp extends StatelessWidget {
  const EveParityApp({super.key});

  @override
  Widget build(BuildContext context) {
    return const MaterialApp(
      debugShowCheckedModeBanner: false,
      home: Scaffold(
        backgroundColor: Color(0xFF020909),
        body: SafeArea(
          child: Padding(
            padding: EdgeInsets.all(16),
            child: CultUiInspectorSurface(),
          ),
        ),
      ),
    );
  }
}

class CultUiInspectorSurface extends StatelessWidget {
  const CultUiInspectorSurface({super.key});

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.topLeft,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 1180),
        child: DecoratedBox(
          decoration: BoxDecoration(
            color: const Color(0xEE071918),
            border: Border.all(color: const Color(0x4767F0E4)),
            borderRadius: BorderRadius.circular(6),
            boxShadow: const [
              BoxShadow(color: Color(0x59000000), blurRadius: 26, offset: Offset(0, 12)),
            ],
          ),
          child: const Padding(
            padding: EdgeInsets.all(12),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'AETHERIC FIELD TESTER',
                  style: TextStyle(
                    color: Color(0xFF8BA5A3),
                    fontFamily: 'monospace',
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                SizedBox(height: 10),
                InspectorSliderRow(label: 'FOV', value: 38 / 120),
                SizedBox(height: 6),
                InspectorSliderRow(label: 'THROTTLE DECAY', value: 5 / 20),
                SizedBox(height: 6),
                InspectorSliderRow(label: 'FLOW SPEED', value: 2 / 10),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class InspectorSliderRow extends StatelessWidget {
  const InspectorSliderRow({
    required this.label,
    required this.value,
    super.key,
  });

  final String label;
  final double value;

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(minHeight: 34),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xF5201F2B), Color(0xF513141D)],
        ),
        border: Border.all(color: const Color(0x10FFFFFF)),
        borderRadius: BorderRadius.circular(4),
        boxShadow: const [
          BoxShadow(color: Color(0x66000000), blurRadius: 8, offset: Offset(0, 2)),
        ],
      ),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final labelText = Text(
            label,
            style: const TextStyle(
              color: Color(0xFFFFB84F),
              fontFamily: 'monospace',
              fontSize: 13,
              fontWeight: FontWeight.w700,
            ),
          );
          if (constraints.maxWidth < 520) {
            return Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                labelText,
                const SizedBox(height: 4),
                CultUiSlider(value: value),
              ],
            );
          }

          return Row(
            children: [
              SizedBox(width: 190, child: labelText),
              Expanded(child: CultUiSlider(value: value)),
            ],
          );
        },
      ),
    );
  }
}

class CultUiSlider extends StatelessWidget {
  const CultUiSlider({required this.value, super.key});

  final double value;

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      painter: _SliderPainter(value.clamp(0, 1)),
      child: const SizedBox(height: 22, width: double.infinity),
    );
  }
}

class _SliderPainter extends CustomPainter {
  _SliderPainter(this.value);

  final double value;

  @override
  void paint(Canvas canvas, Size size) {
    const accent = Color(0xFFFFB84F);
    final centerY = size.height / 2;
    final track = RRect.fromRectAndRadius(
      Rect.fromLTWH(0, centerY - 3, size.width, 6),
      const Radius.circular(2),
    );
    final fill = RRect.fromRectAndRadius(
      Rect.fromLTWH(0, centerY - 3, size.width * value, 6),
      const Radius.circular(2),
    );
    final trackPaint = Paint()..color = const Color(0x57000000);
    final fillPaint = Paint()..color = accent;
    final thumbPaint = Paint()
      ..color = accent
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 3);
    final thumbCorePaint = Paint()..color = accent;

    canvas.drawRRect(track, trackPaint);
    canvas.drawRRect(fill, fillPaint);
    final thumbCenter = Offset(size.width * value, centerY);
    canvas.drawCircle(thumbCenter, 7, thumbPaint);
    canvas.drawCircle(thumbCenter, 6, thumbCorePaint);
  }

  @override
  bool shouldRepaint(covariant _SliderPainter oldDelegate) {
    return oldDelegate.value != value;
  }
}
