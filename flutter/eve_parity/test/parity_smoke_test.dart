import 'package:eve_parity/main.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('renders CultUI inspector parity fixture', (tester) async {
    await tester.binding.setSurfaceSize(const Size(1280, 720));
    await tester.pumpWidget(const EveParityApp());
    await tester.pumpAndSettle();

    await expectLater(
      find.byType(EveParityApp),
      matchesGoldenFile('goldens/cultui-inspector.png'),
    );
  });
}
