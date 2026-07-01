using System;
using System.Collections.Generic;
using System.Linq;
using GameCult.Mesh;

#nullable enable

namespace GameCult.Eve.Surface
{
    /// <summary>
    /// Fluent CultUI/Eve surface builder. Eve owns the surface document; CultMesh only supplies typed binding descriptors.
    /// </summary>
    public sealed class EveSurfaceBuilder
    {
        private readonly string _surfaceId;
        private readonly List<EveSurfaceComponent> _children = new();
        private readonly List<EveStyleToken> _styles = new();
        private readonly List<EveCommandTemplate> _commands = new();
        private long _version = 1;
        private string _providerId = "gamecult";
        private string _providerKind = "cultui.surface";
        private string _title = "";
        private string _updatedAtUtc = "";

        public EveSurfaceBuilder(string surfaceId)
        {
            _surfaceId = RequireNonEmpty(surfaceId, nameof(surfaceId));
        }

        public EveSurfaceBuilder Provider(string providerId, string providerKind)
        {
            _providerId = providerId ?? "";
            _providerKind = providerKind ?? "";
            return this;
        }

        public EveSurfaceBuilder Title(string title)
        {
            _title = title ?? "";
            _children.Add(Text($"{_surfaceId}.title", _title, "text.title"));
            return this;
        }

        public EveSurfaceBuilder TitleSubtitle(string title, string subtitle)
        {
            _title = string.IsNullOrWhiteSpace(subtitle) ? title ?? "" : $"{title} {subtitle}";
            _children.Add(Text($"{_surfaceId}.title", title ?? "", "text.title"));
            _children.Add(Text($"{_surfaceId}.subtitle", subtitle ?? "", "text.subtitle"));
            return this;
        }

        public EveSurfaceBuilder Text(string text, string? id = null)
        {
            _children.Add(Text(id ?? $"{_surfaceId}.text.{_children.Count}", text, "text"));
            return this;
        }

        public EveSurfaceBuilder Button(string label, string command)
        {
            var operation = CultMesh.OperationBinding(command, label);
            _commands.Add(new EveCommandTemplate(operation));
            _children.Add(ButtonComponent($"{_surfaceId}.button.{Slug(label)}", label, operation));
            return this;
        }

        public EveSurfaceBuilder Button(string label, CultMeshOperationBindingDescriptor operation)
        {
            if (operation == null) throw new ArgumentNullException(nameof(operation));
            _commands.Add(new EveCommandTemplate(operation));
            _children.Add(ButtonComponent($"{_surfaceId}.button.{Slug(label)}", label, operation));
            return this;
        }

        public EveSurfaceBuilder ButtonColumn(string id, Action<EveSurfaceGroupBuilder> build)
        {
            return Group(id, "column", build);
        }

        public EveSurfaceBuilder ButtonRow(string id, Action<EveSurfaceGroupBuilder> build)
        {
            return Group(id, "row", build);
        }

        public EveSurfaceBuilder Form(string id, Action<EveSurfaceFormBuilder> build)
        {
            if (build == null) throw new ArgumentNullException(nameof(build));
            var form = new EveSurfaceFormBuilder(id, AddCommand);
            build(form);
            _children.Add(form.Build());
            return this;
        }

        public EveSurfaceBuilder EmbeddedDocument(
            string slotId,
            string documentId,
            string schemaId,
            string presentationKind,
            CultMeshRouteHint? routeHint = null)
        {
            _children.Add(new EveSurfaceComponent(
                $"{_surfaceId}.slot.{Slug(slotId)}",
                "surface.slot",
                new Dictionary<string, string>(StringComparer.Ordinal)
                {
                    ["slotId"] = slotId ?? "",
                    ["documentId"] = documentId ?? "",
                    ["schemaId"] = schemaId ?? "",
                    ["presentationKind"] = presentationKind ?? ""
                },
                Array.Empty<EveSurfaceComponent>(),
                Array.Empty<CultMeshStateBindingDescriptor>(),
                new[]
                {
                    new EveEmbeddedDocumentSlot(
                        slotId ?? "",
                        documentId ?? "",
                        schemaId ?? "",
                        presentationKind ?? "",
                        routeHint)
                }));
            return this;
        }

        public EveSurfaceBuilder Style(string name, string value)
        {
            _styles.Add(new EveStyleToken(name, value));
            return this;
        }

        public EveSurfaceBuilder Version(long version)
        {
            _version = version;
            return this;
        }

        public EveSurfaceBuilder UpdatedAtUtc(string updatedAtUtc)
        {
            _updatedAtUtc = updatedAtUtc ?? "";
            return this;
        }

        public EveSurfaceDocument Build()
        {
            return new EveSurfaceDocument(
                _providerId,
                _providerKind,
                _title,
                _version,
                string.IsNullOrWhiteSpace(_updatedAtUtc) ? DateTime.UtcNow.ToString("O") : _updatedAtUtc,
                new EveSurfaceTree(
                    _surfaceId,
                    new EveSurfaceComponent(
                        $"{_surfaceId}.root",
                        "surface",
                        EmptyProps(),
                        _children.ToArray()),
                    _styles.ToArray()),
                _commands.ToArray());
        }

        private EveSurfaceBuilder Group(string id, string kind, Action<EveSurfaceGroupBuilder> build)
        {
            if (build == null) throw new ArgumentNullException(nameof(build));
            var group = new EveSurfaceGroupBuilder(id, kind, AddCommand);
            build(group);
            _children.Add(group.Build());
            return this;
        }

        private void AddCommand(EveCommandTemplate command)
        {
            if (command != null)
                _commands.Add(command);
        }

        internal static EveSurfaceComponent Text(string id, string value, string kind)
        {
            return new EveSurfaceComponent(
                id,
                kind,
                new Dictionary<string, string>(StringComparer.Ordinal)
                {
                    ["value"] = value ?? ""
                },
                Array.Empty<EveSurfaceComponent>());
        }

        internal static EveSurfaceComponent ButtonComponent(
            string id,
            string label,
            CultMeshOperationBindingDescriptor operation)
        {
            return new EveSurfaceComponent(
                id,
                "control.button",
                new Dictionary<string, string>(StringComparer.Ordinal)
                {
                    ["label"] = label ?? operation.Label,
                    ["command"] = operation.OperationId,
                    ["operationId"] = operation.OperationId,
                    ["schemaId"] = operation.SchemaId
                },
                Array.Empty<EveSurfaceComponent>());
        }

        internal static Dictionary<string, string> EmptyProps()
        {
            return new Dictionary<string, string>(StringComparer.Ordinal);
        }

        internal static string Slug(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
                return "unnamed";

            var chars = value
                .Select(character => char.IsLetterOrDigit(character) ? char.ToLowerInvariant(character) : '.')
                .ToArray();
            var slug = new string(chars).Trim('.');
            while (slug.Contains("..", StringComparison.Ordinal))
                slug = slug.Replace("..", ".", StringComparison.Ordinal);
            return string.IsNullOrWhiteSpace(slug) ? "unnamed" : slug;
        }

        private static string RequireNonEmpty(string value, string paramName)
        {
            return string.IsNullOrWhiteSpace(value)
                ? throw new ArgumentException("Value must be non-empty.", paramName)
                : value;
        }
    }

    public sealed class EveSurfaceGroupBuilder
    {
        private readonly string _id;
        private readonly string _kind;
        private readonly Action<EveCommandTemplate> _addCommand;
        private readonly List<EveSurfaceComponent> _children = new();

        internal EveSurfaceGroupBuilder(
            string id,
            string kind,
            Action<EveCommandTemplate> addCommand)
        {
            _id = id ?? "";
            _kind = kind ?? "column";
            _addCommand = addCommand ?? throw new ArgumentNullException(nameof(addCommand));
        }

        public EveSurfaceGroupBuilder Button(string label, string command)
        {
            var operation = CultMesh.OperationBinding(command, label);
            _addCommand(new EveCommandTemplate(operation));
            _children.Add(EveSurfaceBuilder.ButtonComponent($"{_id}.button.{EveSurfaceBuilder.Slug(label)}", label, operation));
            return this;
        }

        public EveSurfaceGroupBuilder Button(string label, CultMeshOperationBindingDescriptor operation)
        {
            if (operation == null) throw new ArgumentNullException(nameof(operation));
            _addCommand(new EveCommandTemplate(operation));
            _children.Add(EveSurfaceBuilder.ButtonComponent($"{_id}.button.{EveSurfaceBuilder.Slug(label)}", label, operation));
            return this;
        }

        internal EveSurfaceComponent Build()
        {
            return new EveSurfaceComponent(_id, _kind, EveSurfaceBuilder.EmptyProps(), _children.ToArray());
        }
    }

    public sealed class EveSurfaceFormBuilder
    {
        private readonly string _id;
        private readonly Action<EveCommandTemplate> _addCommand;
        private readonly List<EveSurfaceComponent> _children = new();

        internal EveSurfaceFormBuilder(string id, Action<EveCommandTemplate> addCommand)
        {
            _id = id ?? "";
            _addCommand = addCommand ?? throw new ArgumentNullException(nameof(addCommand));
        }

        public EveSurfaceFormBuilder Text(
            string label,
            string value,
            CultMeshOperationBindingDescriptor operation,
            CultMeshStateBindingDescriptor? binding = null)
        {
            if (operation == null) throw new ArgumentNullException(nameof(operation));
            _addCommand(new EveCommandTemplate(operation));
            _children.Add(Control(
                "control.text",
                label,
                value,
                operation,
                binding));
            return this;
        }

        public EveSurfaceFormBuilder Toggle(
            string label,
            bool value,
            CultMeshOperationBindingDescriptor operation,
            CultMeshStateBindingDescriptor? binding = null)
        {
            if (operation == null) throw new ArgumentNullException(nameof(operation));
            _addCommand(new EveCommandTemplate(operation));
            _children.Add(Control(
                "control.toggle",
                label,
                value ? "true" : "false",
                operation,
                binding));
            return this;
        }

        public EveSurfaceFormBuilder Metric(
            string label,
            string value,
            CultMeshStateBindingDescriptor? binding = null)
        {
            var bindings = binding == null
                ? Array.Empty<CultMeshStateBindingDescriptor>()
                : new[] { binding };
            _children.Add(new EveSurfaceComponent(
                $"{_id}.metric.{EveSurfaceBuilder.Slug(label)}",
                "metric",
                new Dictionary<string, string>(StringComparer.Ordinal)
                {
                    ["label"] = label ?? "",
                    ["value"] = value ?? ""
                },
                Array.Empty<EveSurfaceComponent>(),
                bindings));
            return this;
        }

        internal EveSurfaceComponent Build()
        {
            return new EveSurfaceComponent(_id, "form", EveSurfaceBuilder.EmptyProps(), _children.ToArray());
        }

        private EveSurfaceComponent Control(
            string kind,
            string label,
            string value,
            CultMeshOperationBindingDescriptor operation,
            CultMeshStateBindingDescriptor? binding)
        {
            var bindings = binding == null
                ? Array.Empty<CultMeshStateBindingDescriptor>()
                : new[] { binding };
            return new EveSurfaceComponent(
                $"{_id}.{EveSurfaceBuilder.Slug(label)}",
                kind,
                new Dictionary<string, string>(StringComparer.Ordinal)
                {
                    ["label"] = label ?? "",
                    ["value"] = value ?? "",
                    ["command"] = operation.OperationId,
                    ["operationId"] = operation.OperationId,
                    ["schemaId"] = operation.SchemaId
                },
                Array.Empty<EveSurfaceComponent>(),
                bindings);
        }
    }

    public static class EveSurface
    {
        public static EveSurfaceBuilder Create(string surfaceId)
        {
            return new EveSurfaceBuilder(surfaceId);
        }
    }
}
