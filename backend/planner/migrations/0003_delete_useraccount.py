# Generated manually — removes unused OAuth profile table.

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("planner", "0002_user_account"),
    ]

    operations = [
        migrations.DeleteModel(name="UserAccount"),
    ]
