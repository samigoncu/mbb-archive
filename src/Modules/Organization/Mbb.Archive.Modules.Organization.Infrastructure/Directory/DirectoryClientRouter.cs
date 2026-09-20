using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Organization.Application.Directory;

namespace Mbb.Archive.Modules.Organization.Infrastructure.Directory;

internal sealed class DirectoryClientRouter : IDirectoryClient
{
    private readonly LdapDirectoryClient _ldapClient;
    private readonly IMalatyaApiSettingsStore _malatyaStore;
    private readonly IDirectoryRuntime _runtime;

    public DirectoryClientRouter(
        LdapDirectoryClient ldapClient,
        IMalatyaApiSettingsStore malatyaStore,
        IDirectoryRuntime runtime)
    {
        _ldapClient = ldapClient;
        _malatyaStore = malatyaStore;
        _runtime = runtime;
    }

    public bool IsConfigured => _runtime.Current.IsEnabled ? _ldapClient.IsConfigured : true;

    public async Task<Result<DirectoryUser>> FindUserAsync(string subjectId, CancellationToken cancellationToken)
    {
        var malatya = await _malatyaStore.GetAsync(cancellationToken);
        if (malatya.IsDirectorySyncEnabled)
        {
            // Malatya API dizin modu aktifken kullanıcı künyesi
            return Result<DirectoryUser>.Success(new DirectoryUser(
                SubjectId: subjectId,
                DisplayName: subjectId,
                UnitReference: null,
                Groups: [],
                IsActive: true));
        }

        return await _ldapClient.FindUserAsync(subjectId, cancellationToken);
    }

    public async Task<Result<IReadOnlyList<DirectoryUnit>>> ListUnitsAsync(CancellationToken cancellationToken)
    {
        var malatya = await _malatyaStore.GetAsync(cancellationToken);
        if (malatya.IsDirectorySyncEnabled)
        {
            return Result<IReadOnlyList<DirectoryUnit>>.Success([]);
        }

        return await _ldapClient.ListUnitsAsync(cancellationToken);
    }
}

