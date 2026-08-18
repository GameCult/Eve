using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using GameCult.Mesh;

#nullable enable

namespace GameCult.Eve.Surface
{
    public static class EveInventoryInteraction
    {
        public const string GridKind = "inventory.grid";
        public const string ItemKind = "inventory.item";
        public const string DragSessionKind = "inventory.drag_session";

        public static bool TryCreatePlacementPreview(
            EveSurfaceComponent source,
            EveSurfaceComponent target,
            int destinationX,
            int destinationY,
            out EveInventoryPlacementPreview? preview)
        {
            preview = null;
            if (source == null || target == null ||
                !string.Equals(source.Kind, ItemKind, StringComparison.Ordinal) ||
                !string.Equals(target.Kind, GridKind, StringComparison.Ordinal))
            {
                return false;
            }

            var columns = Math.Max(1, Int(target.GetProp("columns"), 1));
            var rows = Math.Max(1, Int(target.GetProp("rows"), 1));
            var localCells = ItemCells(source);
            var cells = localCells
                .Select(cell => new EveInventoryCell(destinationX + cell.X, destinationY + cell.Y))
                .ToArray();
            var validCells = ParseCells(target.GetProp("validCells"));
            var occupied = new HashSet<(int X, int Y)>();
            foreach (var item in target.Children.Where(child =>
                string.Equals(child.Kind, ItemKind, StringComparison.Ordinal) &&
                !ReferenceEquals(child, source) &&
                !string.Equals(child.Id, source.Id, StringComparison.Ordinal)))
            {
                var originX = Int(item.GetProp("x"), 0);
                var originY = Int(item.GetProp("y"), 0);
                foreach (var cell in ItemCells(item))
                    occupied.Add((originX + cell.X, originY + cell.Y));
            }

            var reason = "valid";
            if (cells.Any(cell => cell.X < 0 || cell.Y < 0 || cell.X >= columns || cell.Y >= rows))
                reason = "outside-grid";
            else if (validCells.Count > 0 && cells.Any(cell => !validCells.Contains((cell.X, cell.Y))))
                reason = "outside-valid-shape";
            else if (cells.Any(cell => occupied.Contains((cell.X, cell.Y))))
                reason = "occupied";

            preview = new EveInventoryPlacementPreview(
                string.Equals(reason, "valid", StringComparison.Ordinal),
                reason,
                destinationX,
                destinationY,
                cells);
            return true;
        }

        public static bool TryCreateDropRequest(
            EveSurfaceDocument document,
            EveSurfaceComponent source,
            EveSurfaceComponent target,
            int destinationX,
            int destinationY,
            string clientId,
            out EveSurfaceCommandRequest? request)
        {
            request = null;
            if (document == null || source == null || target == null ||
                !string.Equals(source.Kind, ItemKind, StringComparison.Ordinal) ||
                !string.Equals(target.Kind, GridKind, StringComparison.Ordinal))
            {
                return false;
            }

            var sourceKind = source.GetProp("sourceKind", source.GetProp("source"));
            var command = target.GetProp($"dropCommand.{sourceKind}", target.GetProp("dropCommand"));
            if (string.IsNullOrWhiteSpace(sourceKind) || string.IsNullOrWhiteSpace(command))
                return false;

            var sourceIndex = Int(source.GetProp("sourceIndex"), -1);
            var targetIndex = Int(target.GetProp("targetIndex"), -1);
            var targetKind = target.GetProp("targetKind");
            var payload = new Dictionary<string, string>(StringComparer.Ordinal);
            CopyPayloadProps(source, payload);
            CopyPayloadProps(target, payload);
            payload["sourceKind"] = sourceKind;
            payload["originEntityKey"] = source.GetProp("sourceEntityKey", source.GetProp("entityKey"));
            payload["originIndex"] = sourceIndex.ToString(CultureInfo.InvariantCulture);
            payload["originCargoIndex"] = (string.Equals(sourceKind, "cargo", StringComparison.Ordinal) ? sourceIndex : -1)
                .ToString(CultureInfo.InvariantCulture);
            payload["itemKey"] = source.GetProp("itemKey");
            payload["quantity"] = Math.Max(1, Int(source.GetProp("quantity"), 1)).ToString(CultureInfo.InvariantCulture);
            payload["sourceX"] = Int(source.GetProp("x"), int.MinValue).ToString(CultureInfo.InvariantCulture);
            payload["sourceY"] = Int(source.GetProp("y"), int.MinValue).ToString(CultureInfo.InvariantCulture);
            payload["sourceRotation"] = source.GetProp("rotation", "None");
            payload["destinationKind"] = targetKind;
            payload["destinationEntityKey"] = target.GetProp("targetEntityKey", target.GetProp("entityKey"));
            payload["destinationIndex"] = targetIndex.ToString(CultureInfo.InvariantCulture);
            payload["destinationCargoIndex"] = (string.Equals(targetKind, "cargo", StringComparison.Ordinal) ? targetIndex : -1)
                .ToString(CultureInfo.InvariantCulture);
            payload["destinationX"] = destinationX.ToString(CultureInfo.InvariantCulture);
            payload["destinationY"] = destinationY.ToString(CultureInfo.InvariantCulture);
            payload["destinationRotation"] = target.GetProp("dropRotation", source.GetProp("rotation", "None"));
            payload["hasDestinationPosition"] = "true";
            var template = document.Commands.FirstOrDefault(candidate =>
                string.Equals(candidate.Command, command, StringComparison.Ordinal));
            var idempotencyKey = "eve-inventory-drop-" + Guid.NewGuid().ToString("N");
            var operation = template == null
                ? CultMesh.OperationInvocation(command, idempotencyKey: idempotencyKey)
                : CultMesh.OperationInvocation(template.Operation, idempotencyKey);
            request = new EveSurfaceCommandRequest(
                document.ProviderId,
                document.Surface.Id,
                operation,
                CultMesh.OperationPayload(payload),
                DateTimeOffset.UtcNow,
                string.IsNullOrWhiteSpace(clientId) ? "unity-uitoolkit" : clientId);
            return true;
        }

        private static void CopyPayloadProps(
            EveSurfaceComponent component,
            IDictionary<string, string> payload)
        {
            const string prefix = "payload.";
            foreach (var prop in component.Props)
            {
                if (!prop.Key.StartsWith(prefix, StringComparison.Ordinal) ||
                    prop.Key.Length == prefix.Length)
                {
                    continue;
                }

                payload[prop.Key.Substring(prefix.Length)] = prop.Value ?? "";
            }
        }

        private static int Int(string value, int fallback) =>
            int.TryParse(value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsed)
                ? parsed
                : fallback;

        private static IReadOnlyList<EveInventoryCell> ItemCells(EveSurfaceComponent item)
        {
            var explicitCells = ParseCells(item.GetProp("shapeCells"));
            if (explicitCells.Count > 0)
                return explicitCells.Select(cell => new EveInventoryCell(cell.X, cell.Y)).ToArray();

            var width = Math.Max(1, Int(item.GetProp("shapeWidth"), 1));
            var height = Math.Max(1, Int(item.GetProp("shapeHeight"), 1));
            var rotation = item.GetProp("rotation");
            if (string.Equals(rotation, "Clockwise90", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(rotation, "Clockwise270", StringComparison.OrdinalIgnoreCase))
            {
                (width, height) = (height, width);
            }
            return Enumerable.Range(0, height)
                .SelectMany(y => Enumerable.Range(0, width).Select(x => new EveInventoryCell(x, y)))
                .ToArray();
        }

        private static HashSet<(int X, int Y)> ParseCells(string value)
        {
            var cells = new HashSet<(int X, int Y)>();
            foreach (var token in (value ?? "").Split(new[] { ';' }, StringSplitOptions.RemoveEmptyEntries))
            {
                var coordinates = token.Split(',');
                if (coordinates.Length == 2 &&
                    int.TryParse(coordinates[0], NumberStyles.Integer, CultureInfo.InvariantCulture, out var x) &&
                    int.TryParse(coordinates[1], NumberStyles.Integer, CultureInfo.InvariantCulture, out var y))
                {
                    cells.Add((x, y));
                }
            }
            return cells;
        }
    }

    public sealed class EveInventoryPlacementPreview
    {
        public EveInventoryPlacementPreview(
            bool isValid,
            string reason,
            int destinationX,
            int destinationY,
            IReadOnlyList<EveInventoryCell> cells)
        {
            IsValid = isValid;
            Reason = reason ?? "";
            DestinationX = destinationX;
            DestinationY = destinationY;
            Cells = cells ?? Array.Empty<EveInventoryCell>();
        }

        public bool IsValid { get; }
        public string Reason { get; }
        public int DestinationX { get; }
        public int DestinationY { get; }
        public IReadOnlyList<EveInventoryCell> Cells { get; }
    }

    public readonly struct EveInventoryCell
    {
        public EveInventoryCell(int x, int y)
        {
            X = x;
            Y = y;
        }

        public int X { get; }
        public int Y { get; }
    }
}
