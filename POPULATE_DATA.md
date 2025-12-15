# Populating Mock Data

This guide explains how to populate the database with mock data for testing and product presentation.

## Quick Start

```bash
# Activate virtual environment (if not already active)
source venv/bin/activate

# Populate database with mock data
python manage.py populate_mock_data

# To clear existing data and repopulate
python manage.py populate_mock_data --clear
```

## What Gets Created

### Users (12 total)

All users have the password: `testpass123`

1. **gardening_guru** - John Green (San Francisco, CA)
   - Offers gardening help
2. **tech_helper** - Sarah Tech (Oakland, CA)
   - Offers tech support
3. **cooking_mom** - Maria Cook (Berkeley, CA)
   - Offers home-cooked meals
4. **pet_lover** - Alex Peterson (San Francisco, CA)
   - Offers pet sitting
5. **new_parent** - Emily Parent (San Francisco, CA)
   - Requests childcare help
6. **elderly_neighbor** - Robert Elder (Oakland, CA)
   - Requests moving help
7. **student_helper** - David Student (Berkeley, CA)
   - Requests tutoring help
8. **car_owner** - Lisa Driver (San Francisco, CA)
   - Requests car jump start
9. **handyman_joe** - Joe Handyman (San Francisco, CA)
   - Offers repair services
10. **tutor_sarah** - Sarah Teacher (Berkeley, CA)

    - Offers tutoring

11. **chef_mike** - Mike Chef (Oakland, CA)

    - Offers cooking lessons

12. **driver_alex** - Alex Driver (San Francisco, CA)
    - Offers rides and delivery

### Tags (20 total)

- gardening, outdoor, technology, computers
- cooking, food, pets, care
- childcare, babysitting, moving, heavy lifting
- tutoring, education, automotive, emergency
- repairs, cleaning, delivery, transportation

### Offers (8 total)

1. Free Gardening Help
2. Computer Troubleshooting Assistance
3. Home-Cooked Meal Delivery
4. Pet Sitting Services
5. Basic Home Repairs
6. Math and Science Tutoring
7. Cooking Lessons
8. Rides and Delivery Services

### Needs (6 total)

1. Babysitting for Doctor Appointment
2. Help Moving Furniture
3. Math Tutoring Needed
4. Car Battery Jump Start
5. House Cleaning Help
6. Grocery Shopping Assistance

### Additional Data

- Sample offer interests
- Sample need interests
- Sample handshakes (to demonstrate completed exchanges)

## Testing Login

You can log in with any of the created users:

```
Username: gardening_guru
Password: testpass123
```

Or any other username from the list above with the same password.

## Notes

- The command is **idempotent** - safe to run multiple times
- Uses `get_or_create` to avoid duplicates
- Only clears data when using `--clear` flag
- All locations are in the San Francisco Bay Area
- All offers and needs have realistic expiration dates (20-35 days from creation)

## Troubleshooting

If you encounter errors:

1. Make sure migrations are up to date:

   ```bash
   python manage.py migrate
   ```

2. If you get unique constraint errors, use the `--clear` flag:

   ```bash
   python manage.py populate_mock_data --clear
   ```

3. Check that the core app is properly installed in `settings.py`
