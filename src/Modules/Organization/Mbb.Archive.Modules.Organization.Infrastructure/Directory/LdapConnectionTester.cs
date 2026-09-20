using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Organization.Application.Directory;

namespace Mbb.Archive.Modules.Organization.Infrastructure.Directory;

internal sealed class LdapConnectionTester : ILdapConnectionTester
{
    public Task<Result<string>> TestConnectionAsync(
        string host,
        int port,
        bool useSsl,
        string bindDn,
        string password,
        int timeoutSeconds,
        CancellationToken ct)
        => LdapDirectoryClient.TestConnectionAsync(host, port, useSsl, bindDn, password, timeoutSeconds, ct);
}

