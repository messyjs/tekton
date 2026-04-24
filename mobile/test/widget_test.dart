import 'package:flutter_test/flutter_test.dart';
import 'package:tekton_app/app.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

void main() {
  testWidgets('Tekton app smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const ProviderScope(child: TektonApp()));
    await tester.pumpAndSettle();
    expect(find.text('Tekton'), findsOneWidget);
  });
}