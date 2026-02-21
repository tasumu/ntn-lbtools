"""Initial schema and seed data."""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None

SAMPLE_MODCOD_ID = "00000000-0000-0000-0000-00000000d001"
SAMPLE_SAT_ID = "00000000-0000-0000-0000-00000000a001"
SAMPLE_TX_ID = "00000000-0000-0000-0000-00000000e001"
SAMPLE_RX_ID = "00000000-0000-0000-0000-00000000e002"
SAMPLE_SCENARIO_ID = "00000000-0000-0000-0000-00000000c001"


def upgrade() -> None:
    op.create_table(
        "satellites",
        sa.Column("id", sa.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("orbit_type", sa.String(length=20), nullable=False),
        sa.Column("longitude_deg", sa.Float(), nullable=True),
        sa.Column("inclination_deg", sa.Float(), nullable=True),
        sa.Column("transponder_bandwidth_mhz", sa.Float(), nullable=True),
        sa.Column("eirp_dbw", sa.Float(), nullable=True),
        sa.Column("gt_db_per_k", sa.Float(), nullable=True),
        sa.Column("frequency_band", sa.String(length=20), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint("name", name="uq_satellites_name"),
        sa.CheckConstraint(
            "(longitude_deg IS NULL) OR (longitude_deg >= -180 AND longitude_deg <= 180)",
            name="ck_satellites_longitude_range",
        ),
        sa.CheckConstraint(
            "(transponder_bandwidth_mhz IS NULL) OR (transponder_bandwidth_mhz > 0)",
            name="ck_satellites_bandwidth_positive",
        ),
    )

    op.create_table(
        "earth_stations",
        sa.Column("id", sa.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("antenna_diameter_m", sa.Float(), nullable=True),
        sa.Column("antenna_gain_tx_db", sa.Float(), nullable=True),
        sa.Column("antenna_gain_rx_db", sa.Float(), nullable=True),
        sa.Column("noise_temperature_k", sa.Float(), nullable=True),
        sa.Column("eirp_dbw", sa.Float(), nullable=True),
        sa.Column("tx_power_dbw", sa.Float(), nullable=True),
        sa.Column("gt_db_per_k", sa.Float(), nullable=True),
        sa.Column("polarization", sa.String(length=20), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint("name", name="uq_earth_stations_name"),
        sa.CheckConstraint(
            "(antenna_diameter_m IS NULL) OR (antenna_diameter_m > 0)",
            name="ck_earth_stations_diameter_positive",
        ),
        sa.CheckConstraint(
            "(noise_temperature_k IS NULL) OR (noise_temperature_k > 0)",
            name="ck_earth_stations_noise_temp_positive",
        ),
    )

    op.create_table(
        "modcod_tables",
        sa.Column("id", sa.UUID(as_uuid=True), primary_key=True),
        sa.Column("waveform", sa.String(length=50), nullable=False),
        sa.Column("version", sa.String(length=50), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("entries", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint("waveform", "version", name="uq_modcod_waveform_version"),
    )
    op.create_index("ix_modcod_tables_waveform", "modcod_tables", ["waveform"])

    op.create_table(
        "scenarios",
        sa.Column("id", sa.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("waveform_strategy", sa.String(length=50), nullable=False),
        sa.Column("transponder_type", sa.String(length=50), nullable=False),
        sa.Column("modcod_table_id", sa.UUID(as_uuid=True), nullable=False),
        sa.Column("satellite_id", sa.UUID(as_uuid=True), nullable=True),
        sa.Column("earth_station_tx_id", sa.UUID(as_uuid=True), nullable=True),
        sa.Column("earth_station_rx_id", sa.UUID(as_uuid=True), nullable=True),
        sa.Column("schema_version", sa.String(length=20), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("payload_snapshot", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint(
            "status IN ('Draft','Saved','Archived')",
            name="ck_scenarios_status_valid",
        ),
        sa.CheckConstraint(
            "schema_version <> ''",
            name="ck_scenarios_schema_version_nonempty",
        ),
        sa.ForeignKeyConstraint(
            ["modcod_table_id"],
            ["modcod_tables.id"],
            name="fk_scenarios_modcod_table",
        ),
        sa.ForeignKeyConstraint(
            ["satellite_id"],
            ["satellites.id"],
            name="fk_scenarios_satellite",
        ),
        sa.ForeignKeyConstraint(
            ["earth_station_tx_id"],
            ["earth_stations.id"],
            name="fk_scenarios_earth_station_tx",
        ),
        sa.ForeignKeyConstraint(
            ["earth_station_rx_id"],
            ["earth_stations.id"],
            name="fk_scenarios_earth_station_rx",
        ),
    )

    entries = [
        {
            "id": "qpsk-1/4",
            "modulation": "QPSK",
            "code_rate": "1/4",
            "required_cn0_dbhz": 65,
            "info_bits_per_symbol": 0.5,
        },
        {
            "id": "qpsk-1/2",
            "modulation": "QPSK",
            "code_rate": "1/2",
            "required_cn0_dbhz": 70,
            "info_bits_per_symbol": 1.0,
        },
        {
            "id": "8psk-3/4",
            "modulation": "8PSK",
            "code_rate": "3/4",
            "required_cn0_dbhz": 78,
            "info_bits_per_symbol": 2.25,
        },
    ]

    modcod_table = sa.table(
        "modcod_tables",
        sa.column("id", postgresql.UUID(as_uuid=True)),
        sa.column("waveform", sa.String),
        sa.column("version", sa.String),
        sa.column("description", sa.Text),
        sa.column("entries", postgresql.JSONB),
        sa.column("published_at", sa.DateTime(timezone=True)),
        sa.column("created_at", sa.DateTime(timezone=True)),
    )
    op.get_bind().execute(
        postgresql.insert(modcod_table)
        .values(
            id=SAMPLE_MODCOD_ID,
            waveform="DVB_S2X",
            version="sample-1.0.0",
            description="Sample minimal ModCod table (info_bits_per_symbol-based)",
            entries=entries,
            published_at=sa.func.now(),
            created_at=sa.func.now(),
        )
        .on_conflict_do_nothing(),
    )

    satellites = sa.table(
        "satellites",
        sa.column("id", postgresql.UUID(as_uuid=True)),
        sa.column("name", sa.String),
        sa.column("description", sa.Text),
        sa.column("orbit_type", sa.String),
        sa.column("longitude_deg", sa.Float),
        sa.column("inclination_deg", sa.Float),
        sa.column("transponder_bandwidth_mhz", sa.Float),
        sa.column("eirp_dbw", sa.Float),
        sa.column("gt_db_per_k", sa.Float),
        sa.column("frequency_band", sa.String),
        sa.column("notes", sa.Text),
        sa.column("created_at", sa.DateTime(timezone=True)),
        sa.column("updated_at", sa.DateTime(timezone=True)),
    )
    earth_stations = sa.table(
        "earth_stations",
        sa.column("id", postgresql.UUID(as_uuid=True)),
        sa.column("name", sa.String),
        sa.column("description", sa.Text),
        sa.column("antenna_diameter_m", sa.Float),
        sa.column("antenna_gain_tx_db", sa.Float),
        sa.column("antenna_gain_rx_db", sa.Float),
        sa.column("noise_temperature_k", sa.Float),
        sa.column("eirp_dbw", sa.Float),
        sa.column("tx_power_dbw", sa.Float),
        sa.column("gt_db_per_k", sa.Float),
        sa.column("polarization", sa.String),
        sa.column("notes", sa.Text),
        sa.column("created_at", sa.DateTime(timezone=True)),
        sa.column("updated_at", sa.DateTime(timezone=True)),
    )
    scenarios = sa.table(
        "scenarios",
        sa.column("id", postgresql.UUID(as_uuid=True)),
        sa.column("name", sa.String),
        sa.column("description", sa.Text),
        sa.column("waveform_strategy", sa.String),
        sa.column("transponder_type", sa.String),
        sa.column("modcod_table_id", postgresql.UUID(as_uuid=True)),
        sa.column("satellite_id", postgresql.UUID(as_uuid=True)),
        sa.column("earth_station_tx_id", postgresql.UUID(as_uuid=True)),
        sa.column("earth_station_rx_id", postgresql.UUID(as_uuid=True)),
        sa.column("schema_version", sa.String),
        sa.column("status", sa.String),
        sa.column("payload_snapshot", postgresql.JSONB),
        sa.column("created_at", sa.DateTime(timezone=True)),
        sa.column("updated_at", sa.DateTime(timezone=True)),
    )

    op.get_bind().execute(
        postgresql.insert(satellites)
        .values(
            [
                {
                    "id": SAMPLE_SAT_ID,
                    "name": "SAT-sample-geo-1",
                    "description": "Sample GEO satellite for demo calculations",
                    "orbit_type": "GEO",
                    "longitude_deg": 140.0,
                    "inclination_deg": 0.0,
                    "transponder_bandwidth_mhz": 36.0,
                    "eirp_dbw": 50.0,
                    "gt_db_per_k": 12.0,
                    "frequency_band": "Ku",
                    "notes": "Seeded sample asset",
                    "created_at": sa.func.now(),
                    "updated_at": sa.func.now(),
                },
            ],
        )
        .on_conflict_do_nothing(),
    )

    op.get_bind().execute(
        postgresql.insert(earth_stations)
        .values(
            [
                {
                    "id": SAMPLE_TX_ID,
                    "name": "ES-sample-tx-1",
                    "description": "Sample uplink earth station",
                    "antenna_diameter_m": 2.4,
                    "antenna_gain_tx_db": 45.0,
                    "antenna_gain_rx_db": 40.0,
                    "noise_temperature_k": None,
                    "eirp_dbw": None,
                    "tx_power_dbw": 20.0,
                    "gt_db_per_k": None,
                    "polarization": "RHCP",
                    "notes": "Seeded sample asset",
                    "created_at": sa.func.now(),
                    "updated_at": sa.func.now(),
                },
                {
                    "id": SAMPLE_RX_ID,
                    "name": "ES-sample-rx-1",
                    "description": "Sample downlink earth station",
                    "antenna_diameter_m": 1.8,
                    "antenna_gain_tx_db": 40.0,
                    "antenna_gain_rx_db": 38.0,
                    "noise_temperature_k": 200.0,
                    "eirp_dbw": None,
                    "tx_power_dbw": None,
                    "gt_db_per_k": None,
                    "polarization": "RHCP",
                    "notes": "Seeded sample asset",
                    "created_at": sa.func.now(),
                    "updated_at": sa.func.now(),
                },
            ],
        )
        .on_conflict_do_nothing(),
    )

    payload_snapshot = {
        "static": {
            "modcod_table_id": SAMPLE_MODCOD_ID,
            "modcod_table_version": "sample-1.0.0",
        },
        "entity": {
            "satellite": {
                "id": SAMPLE_SAT_ID,
                "name": "SAT-sample-geo-1",
                "description": "Sample GEO satellite for demo calculations",
                "orbit_type": "GEO",
                "longitude_deg": 140.0,
                "inclination_deg": 0.0,
                "transponder_bandwidth_mhz": 36.0,
                "eirp_dbw": 50.0,
                "gt_db_per_k": 12.0,
                "frequency_band": "Ku",
                "notes": "Seeded sample asset",
            },
            "earth_station_tx": {
                "id": SAMPLE_TX_ID,
                "name": "ES-sample-tx-1",
                "description": "Sample uplink earth station",
                "antenna_diameter_m": 2.4,
                "antenna_gain_tx_db": 45.0,
                "antenna_gain_rx_db": 40.0,
                "eirp_dbw": None,
                "tx_power_dbw": 20.0,
                "gt_db_per_k": None,
                "polarization": "RHCP",
                "notes": "Seeded sample asset",
            },
            "earth_station_rx": {
                "id": SAMPLE_RX_ID,
                "name": "ES-sample-rx-1",
                "description": "Sample downlink earth station",
                "antenna_diameter_m": 1.8,
                "antenna_gain_tx_db": 40.0,
                "antenna_gain_rx_db": 38.0,
                "noise_temperature_k": 200.0,
                "eirp_dbw": None,
                "tx_power_dbw": None,
                "gt_db_per_k": None,
                "polarization": "RHCP",
                "notes": "Seeded sample asset",
            },
        },
        "runtime": {
            "sat_longitude_deg": 140.0,
            "bandwidth_hz": 36000000.0,
            "rolloff": 0.2,
            "uplink": {
                "frequency_hz": 14250000000.0,
                "rain_rate_mm_per_hr": 10.0,
                "temperature_k": 290.0,
                "ground_lat_deg": 35.6895,
                "ground_lon_deg": 139.6917,
                "ground_alt_m": 0.0,
            },
            "downlink": {
                "frequency_hz": 12000000000.0,
                "rain_rate_mm_per_hr": 10.0,
                "temperature_k": 120.0,
                "ground_lat_deg": 35.6895,
                "ground_lon_deg": 139.6917,
                "ground_alt_m": 0.0,
            },
        },
        "strategy": {
            "waveform_strategy": "DVB_S2X",
            "transponder_type": "TRANSPARENT",
        },
        "metadata": {
            "schema_version": "1.1.0",
            "modcod_table_id": SAMPLE_MODCOD_ID,
            "modcod_table_version": "sample-1.0.0",
            "satellite_id": SAMPLE_SAT_ID,
            "earth_station_tx_id": SAMPLE_TX_ID,
            "earth_station_rx_id": SAMPLE_RX_ID,
        },
    }

    op.get_bind().execute(
        postgresql.insert(scenarios)
        .values(
            {
                "id": SAMPLE_SCENARIO_ID,
                "name": "Scenario Sample 1",
                "description": "Sample transparent link budget scenario",
                "waveform_strategy": "DVB_S2X",
                "transponder_type": "TRANSPARENT",
                "modcod_table_id": SAMPLE_MODCOD_ID,
                "satellite_id": SAMPLE_SAT_ID,
                "earth_station_tx_id": SAMPLE_TX_ID,
                "earth_station_rx_id": SAMPLE_RX_ID,
                "schema_version": "1.1.0",
                "status": "Saved",
                "payload_snapshot": payload_snapshot,
                "created_at": sa.func.now(),
                "updated_at": sa.func.now(),
            },
        )
        .on_conflict_do_nothing(),
    )


def downgrade() -> None:
    op.execute(sa.text("DELETE FROM scenarios WHERE id = :id").bindparams(id=SAMPLE_SCENARIO_ID))
    op.execute(
        sa.text("DELETE FROM earth_stations WHERE id IN (:tx_id, :rx_id)").bindparams(
            tx_id=SAMPLE_TX_ID, rx_id=SAMPLE_RX_ID,
        ),
    )
    op.execute(sa.text("DELETE FROM satellites WHERE id = :id").bindparams(id=SAMPLE_SAT_ID))
    op.execute(sa.text("DELETE FROM modcod_tables WHERE id = :id").bindparams(id=SAMPLE_MODCOD_ID))
    op.drop_table("scenarios")
    op.drop_index("ix_modcod_tables_waveform", table_name="modcod_tables")
    op.drop_table("modcod_tables")
    op.drop_table("earth_stations")
    op.drop_table("satellites")
