import 'dart:convert';
import 'dart:io';

import 'package:eve_parity/main.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUpAll(() async {
    final regular = FontLoader('EveParity')
      ..addFont(rootBundle.load('assets/fonts/Roboto-Regular.ttf'))
      ..addFont(rootBundle.load('assets/fonts/Roboto-Bold.ttf'));
    await regular.load();
  });

  for (final viewport in _viewports) {
    testWidgets('renders selected Eve parity fixture at ${viewport.id}', (tester) async {
      await tester.binding.setSurfaceSize(Size(viewport.width, viewport.height));
      addTearDown(() => tester.binding.setSurfaceSize(null));
      await tester.pumpWidget(EveParityApp(key: ValueKey(viewport.id)));
      await tester.pump(const Duration(milliseconds: 100));
      await tester.pumpAndSettle();
      await tester.pumpAndSettle();
      await tester.runAsync(() async {
        await Future<void>.delayed(const Duration(milliseconds: 250));
      });
      await tester.pumpAndSettle();
      expect(find.byType(EveSurfaceView), findsOneWidget);
      if (fixtureId == 'cultui-inspector') {
        expect(find.text('AETHERIC FIELD TESTER'), findsOneWidget);
        expect(find.text('FOV'), findsOneWidget);
        expect(find.text('THROTTLE DECAY'), findsOneWidget);
        expect(find.text('FLOW SPEED'), findsOneWidget);
      }

      await expectLater(
        find.byType(EveParityApp),
        matchesGoldenFile('goldens/$fixtureId-${viewport.id}.png'),
      );
    });
  }

  test('parses embedded document slots for CultUI nested surfaces', () {
    final node = EveNode.fromJson(const {
      'id': 'test.slot',
      'kind': 'surface.slot',
      'props': {'presentationKind': 'inventory.dropdown'},
      'embeddedDocuments': [
        {
          'slotId': 'inventory.dropdown',
          'documentId': 'cultmesh://test/dropdown',
          'schemaId': 'gamecult.eve.surface.v1',
          'presentationKind': 'inventory.dropdown',
        }
      ],
    });

    expect(node.embeddedDocuments, hasLength(1));
    expect(node.embeddedDocuments.single.slotId, 'inventory.dropdown');
    expect(node.embeddedDocuments.single.documentId, 'cultmesh://test/dropdown');
  });

  test('embedded_surface_fixture_contract', () {
    final raw = File('../../web/fixtures/cultui-embedded-surface.json').readAsStringSync();
    final json = jsonDecode(raw) as Map<String, dynamic>;
    final surface = json['surface'] as Map<String, dynamic>;
    final root = EveNode.fromJson(surface['root'] as Map<String, dynamic>);
    final slot = root.children.singleWhere((node) => node.kind == 'surface.slot');

    expect(json['schema'], 'gamecult.eve.surface.v1');
    expect(slot.embeddedDocuments, hasLength(1));
    expect(slot.embeddedDocuments.single.slotId, 'inventory.dropdown');
    expect(slot.embeddedDocuments.single.schemaId, 'gamecult.eve.surface.v1');
    expect(slot.embeddedDocuments.single.presentationKind, 'inventory.dropdown');
  });
}

const fixtureId = String.fromEnvironment('EVE_PARITY_FIXTURE', defaultValue: 'cultui-inspector');

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
