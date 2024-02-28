using Microsoft.Extensions.Configuration;

public static class Services
{
    public static IConfiguration? Configuration { get; private set; }
    public static IServiceProvider? Provider { get; private set; }
    public static void SetConfiguration(IConfiguration configuration) => Configuration ??= configuration;
    public static void SetServiceProvider(IServiceProvider provider) => Provider ??= provider;
    public static void Get<T>(out T? service) => service = (T?)Provider?.GetService(typeof(T));
    public static T? Get<T>() => (T?)Provider?.GetService(typeof(T));
}