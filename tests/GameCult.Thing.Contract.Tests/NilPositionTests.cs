using MessagePack;

namespace GameCult.Thing.Contract.Tests;

/// <summary>
/// The nil vector, written by the Rust crate and read here (goldens/nil-positions.tsv): for every array element of every
/// value golden, the golden with that element replaced by nil, and whether Rust's decode door accepted it. A slot is
/// required exactly when its Rust type is not optional, so this package keeps no list of required slots: it is held to
/// every row.
/// </summary>
public sealed class NilPositionTests
{
    private sealed record Row(string Golden, string Path, int Start, int End, bool Accept);

    private static readonly Dictionary<string, Type> Kinds = new()
    {
        ["surface-all-arms"] = typeof(SurfaceDocument),
        ["composition-all-params"] = typeof(CompositionDocument),
        ["invocation-all-inputs"] = typeof(CommandInvocation),
        ["result-pending"] = typeof(CommandResult),
        ["result-completed"] = typeof(CommandResult),
        ["result-completed-open-surface"] = typeof(CommandResult),
        ["result-completed-open-external"] = typeof(CommandResult),
        ["result-denied"] = typeof(CommandResult),
        ["result-denied-no-node"] = typeof(CommandResult),
        ["result-failed"] = typeof(CommandResult),
        ["asset-catalog"] = typeof(AssetCatalog),
    };

    private static List<Row> Rows() =>
        File.ReadAllLines(Wire.GoldenPath("nil-positions.tsv")).Select(line =>
        {
            var cells = line.Split('\t');
            Assert.That(cells, Has.Length.EqualTo(5), line);
            Assert.That(cells[4], Is.AnyOf("ACCEPT", "REFUSE"), line);
            return new Row(cells[0], cells[1], int.Parse(cells[2]), int.Parse(cells[3]), cells[4] == "ACCEPT");
        }).ToList();

    private static IEnumerable<string> Goldens() => Kinds.Keys;

    [Test]
    public void TheVectorNamesEveryValueGoldenAndNothingElse()
    {
        var rows = Rows();
        Assert.That(rows.Select(r => r.Golden).Distinct().OrderBy(n => n, StringComparer.Ordinal), Is.EqualTo(Kinds.Keys.OrderBy(n => n, StringComparer.Ordinal)));
        Assert.That(rows, Has.Count.GreaterThan(1500));
        Assert.That(rows.Count(r => r.Accept), Is.GreaterThan(0));
    }

    [TestCaseSource(nameof(Goldens))]
    public void EveryNilPositionIsDecidedAsRustDecidedIt(string golden)
    {
        var rows = Rows().Where(r => r.Golden == golden).ToList();
        Assert.That(rows, Is.Not.Empty);
        var bytes = Wire.Golden($"{golden}.bin");
        var wrong = new List<string>();
        foreach (var row in rows)
        {
            var spliced = bytes[..row.Start].Concat(new byte[] { 0xC0 }).Concat(bytes[row.End..]).ToArray();
            try
            {
                var decoded = Wire.Read(Kinds[golden], spliced);
                if (!row.Accept) wrong.Add($"{row.Path}: accepted though Rust refused");
                else if (!Wire.Write(decoded).SequenceEqual(spliced)) wrong.Add($"{row.Path}: accepted but re-encodes to other bytes");
            }
            catch (MessagePackSerializationException)
            {
                if (row.Accept) wrong.Add($"{row.Path}: refused though Rust accepted");
            }
        }

        TestContext.Progress.WriteLine($"NILROWS {golden} rows={rows.Count} accept={rows.Count(r => r.Accept)} refuse={rows.Count(r => !r.Accept)}");
        Assert.That(wrong.Take(20), Is.Empty, $"{golden}: {wrong.Count} rows differ from Rust");
    }
}
