using System.Text.RegularExpressions;

namespace HavenBridge.Api.Utils;

public static class InputSanitizer
{
    public static string? Clean(string? value, int maxLength = 500)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;

        var trimmed = value.Trim();
        trimmed = Regex.Replace(trimmed, @"[\u0000-\u001F\u007F]", " ");
        trimmed = trimmed.Replace("<", string.Empty).Replace(">", string.Empty);
        trimmed = Regex.Replace(trimmed, @"\s{2,}", " ");

        if (trimmed.Length > maxLength)
            trimmed = trimmed[..maxLength];

        return trimmed;
    }
}
