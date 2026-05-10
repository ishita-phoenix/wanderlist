import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


def clear_userstate_rows(apps, schema_editor):
    UserState = apps.get_model("planner", "UserState")
    UserState.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("planner", "0003_delete_useraccount"),
    ]

    operations = [
        migrations.RunPython(clear_userstate_rows, migrations.RunPython.noop),
        migrations.RemoveField(model_name="userstate", name="user_id"),
        migrations.AddField(
            model_name="userstate",
            name="user",
            field=models.OneToOneField(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="planner_state",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
