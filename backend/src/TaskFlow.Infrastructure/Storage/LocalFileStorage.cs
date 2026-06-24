using Microsoft.Extensions.Configuration;
using TaskFlow.Application.Common.Interfaces;

namespace TaskFlow.Infrastructure.Storage;

/// <summary>Persists attachment files under a configurable local directory.</summary>
public class LocalFileStorage : IFileStorage
{
    private readonly string _root;

    public LocalFileStorage(IConfiguration config)
    {
        var configured = config["Storage:AttachmentsPath"];
        _root = string.IsNullOrWhiteSpace(configured)
            ? Path.Combine(AppContext.BaseDirectory, "App_Data", "attachments")
            : configured;
        Directory.CreateDirectory(_root);
    }

    public async Task<string> SaveAsync(Stream content, string storedFileName, CancellationToken ct = default)
    {
        var path = Path.Combine(_root, storedFileName);
        await using var fs = new FileStream(path, FileMode.Create, FileAccess.Write);
        await content.CopyToAsync(fs, ct);
        return storedFileName;
    }

    public Task<Stream?> OpenAsync(string storedFileName, CancellationToken ct = default)
    {
        var path = Path.Combine(_root, storedFileName);
        if (!File.Exists(path)) return Task.FromResult<Stream?>(null);
        return Task.FromResult<Stream?>(new FileStream(path, FileMode.Open, FileAccess.Read));
    }

    public void Delete(string storedFileName)
    {
        var path = Path.Combine(_root, storedFileName);
        if (File.Exists(path)) File.Delete(path);
    }
}
