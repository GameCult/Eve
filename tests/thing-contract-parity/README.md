# thing-contract-parity

The names the C# package `GameCult.Thing.Contract` gives its types. The C# package owns them because CultLib's C# reference compares catalog type names when a store reopens, and every runtime package is held to the C# names.

| File | Rows |
|---|---|
| `catalog-members.tsv` | One row per document slot, `schemaId`, `slot`, `memberName`, `typeName`, as `Wire.Registry`'s catalog entries print them. A list slot reads `System.Collections.Generic.IReadOnlyList<GameCult.Thing.Contract.X>`. |
| `type-names.txt` | The full name of every public type in `GameCult.Thing.Contract`, sorted ordinally. |

`tests/GameCult.Thing.Contract.Tests/NameSetTests.cs` fails when either file disagrees with the C# types. These files change only in the commit that changes the C# types, and the other runtime packages read them without writing them.
