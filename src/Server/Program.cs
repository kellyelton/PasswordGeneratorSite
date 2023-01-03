using PasswordGeneratorSite;
using PasswordGeneratorSite.Providers;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddScoped<AnonPageViewTracker>();

var app = builder.Build();

// capture every request and log the path and ip address
app.Use(async (context, next) =>
{
    var tracker = context.RequestServices.GetRequiredService<AnonPageViewTracker>();

    // Domain name, without the port or scheme
    var host = context.Request.Host.Host;
    var url = context.Request.Path.Value ?? "/";
    var ip = context.Connection.RemoteIpAddress.ToString();
    var user_agent = context.Request.Headers["User-Agent"].ToString();

    tracker.Track(host, url, ip, user_agent);

    await next();
});

app.UseDefaultFiles();
app.UseStaticFiles();

app.UseRouting();

app.Run();
