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
    testWidgets('renders selected Eve parity fixture at ${viewport.id}', (
      tester,
    ) async {
      await tester.binding.setSurfaceSize(
        Size(viewport.width, viewport.height),
      );
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
        },
      ],
    });

    expect(node.embeddedDocuments, hasLength(1));
    expect(node.embeddedDocuments.single.slotId, 'inventory.dropdown');
    expect(
      node.embeddedDocuments.single.documentId,
      'cultmesh://test/dropdown',
    );
  });

  test('embedded_surface_fixture_contract', () {
    final raw = File(
      '../../web/fixtures/cultui-embedded-surface.json',
    ).readAsStringSync();
    final json = jsonDecode(raw) as Map<String, dynamic>;
    final surface = json['surface'] as Map<String, dynamic>;
    final root = EveNode.fromJson(surface['root'] as Map<String, dynamic>);
    final slot = root.children.singleWhere(
      (node) => node.kind == 'surface.slot',
    );

    expect(json['schema'], 'gamecult.eve.surface.v1');
    expect(slot.embeddedDocuments, hasLength(1));
    expect(slot.embeddedDocuments.single.slotId, 'inventory.dropdown');
    expect(slot.embeddedDocuments.single.schemaId, 'gamecult.eve.surface.v1');
    expect(
      slot.embeddedDocuments.single.presentationKind,
      'inventory.dropdown',
    );
  });

  testWidgets('emits gamecult Eve command intent from Aetheria controls', (
    tester,
  ) async {
    final raw = File(
      '../../web/fixtures/aetheria-world-surface.json',
    ).readAsStringSync();
    final json = jsonDecode(raw) as Map<String, dynamic>;
    final state = EveSurfaceState.fromJson(json);
    final intents = <EveCommandIntent>[];

    await tester.pumpWidget(
      MaterialApp(
        home: EveSurfaceView(
          state: state,
          commandSink: (intent, node) => intents.add(intent),
        ),
      ),
    );

    await tester.tap(find.text('Focus Relay'));
    await tester.pump();

    expect(intents, hasLength(1));
    expect(intents.single.schema, 'gamecult.eve.command.v1');
    expect(intents.single.providerId, 'aetheria');
    expect(intents.single.surfaceId, 'aetheria.daemon.game');
    expect(intents.single.command, 'aetheria.daemon.commands');
    expect(intents.single.commandId, 'aetheria.daemon.focus');
    expect(intents.single.clientId, 'flutter-parity');
    expect(intents.single.payload['action']['operation'], 'focus_entity');
  });

  testWidgets('provider picker consumes conformance export providers', (
    tester,
  ) async {
    final catalog = EveProviderCatalog.fromConformanceExport(
      _providerCatalogExport,
    );
    var selected = 'aetheria';

    await tester.pumpWidget(
      MaterialApp(
        home: StatefulBuilder(
          builder: (context, setState) {
            return EveProviderPicker(
              catalog: catalog,
              selectedProviderId: selected,
              onSelected: (providerId) {
                setState(() => selected = providerId);
              },
            );
          },
        ),
      ),
    );

    expect(catalog.providers, hasLength(2));
    expect(catalog.findProvider('gamecult.home.vn')?.ownerRepo, 'Sai');
    expect(
      catalog
          .findProvider('gamecult.home.vn')
          ?.pluginRequirements
          .map((requirement) => requirement.pluginId),
      containsAll(['sai.vn', 'norn.graph', 'tex.math']),
    );
    expect(find.text('aetheria'), findsOneWidget);

    await tester.tap(find.byType(DropdownButton<String>));
    await tester.pumpAndSettle();
    await tester.tap(find.text('gamecult.home.vn').last);
    await tester.pumpAndSettle();

    expect(selected, 'gamecult.home.vn');
  });
}

const fixtureId = String.fromEnvironment(
  'EVE_PARITY_FIXTURE',
  defaultValue: 'cultui-inspector',
);

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

const _providerCatalogExport = {
  'schema': 'gamecult.eve.conformance_export.v1',
  'providers': [
    {
      'providerId': 'aetheria',
      'status': 'advertised',
      'ownerRepo': 'Aetheria',
      'advertisementPath': 'web/fixtures/aetheria.provider-advertisement.json',
      'surfaces': ['aetheria.daemon.game'],
      'commands': ['aetheria.daemon.commands'],
      'pluginRequirements': [],
    },
    {
      'providerId': 'gamecult.home.vn',
      'status': 'advertised',
      'ownerRepo': 'Sai',
      'advertisementPath': 'web/fixtures/sai-vn.provider-advertisement.json',
      'surfaces': ['sai.visual_novel.surface'],
      'commands': ['story.choose', 'story.continue', 'story.jump'],
      'pluginRequirements': [
        {
          'surfaceId': 'sai.visual_novel.surface',
          'pluginId': 'sai.vn',
          'requiredCapabilities': [
            'vn.stage',
            'story.choose',
            'story.continue',
            'story.jump',
          ],
        },
        {
          'surfaceId': 'sai.visual_novel.surface',
          'pluginId': 'norn.graph',
          'requiredCapabilities': ['embed.norn'],
        },
        {
          'surfaceId': 'sai.visual_novel.surface',
          'pluginId': 'tex.math',
          'requiredCapabilities': ['embed.tex'],
        },
      ],
    },
  ],
};
