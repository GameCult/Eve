import 'package:eve_parity/main.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  for (final viewport in _viewports) {
    testWidgets('renders CultUI inspector parity fixture at ${viewport.id}', (tester) async {
      await tester.binding.setSurfaceSize(Size(viewport.width, viewport.height));
      await tester.pumpWidget(const EveParityApp());
      await tester.pumpAndSettle();

      await expectLater(
        find.byType(EveParityApp),
        matchesGoldenFile('goldens/cultui-inspector-${viewport.id}.png'),
      );
    });
  }
}

const _viewports = [
  _Viewport('phone', 390, 844),
  _Viewport('tablet', 768, 1024),
  _Viewport('desktop', 1280, 720),
];

class _Viewport {
  const _Viewport(this.id, this.width, this.height);

  final String id;
  final double width;
  final double height;
}
