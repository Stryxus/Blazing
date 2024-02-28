using Microsoft.JSInterop;

namespace Blazing;

public class Browser
{
    public class LocalStorage
    {
        public async Task SetItem(IJSRuntime IJS, string key, string value) => await IJS.InvokeVoidAsync("runtime.localstorage.set", key, value);

        public async Task<string> GetItem(IJSRuntime IJS, string key) => await IJS.InvokeAsync<string>("runtime.localstorage.get", key);
    }
}
