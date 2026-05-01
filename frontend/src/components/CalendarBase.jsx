// frontend/src/components/CalendarBase.jsx
import { Calendar, dateFnsLocalizer } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { ko } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales: { ko },
})

const sampleEvents = [
  {
    id: 1,
    title: '주간 (D)',
    start: new Date(),
    end: new Date(),
    allDay: true,
    resource: { shift_code: 'D', color: '#3B82F6' },
  },
]

export default function CalendarBase({
  events = sampleEvents,
  eventPropGetter,   // 확장 포인트: 이벤트 스타일 커스터마이징
  dayPropGetter,     // 확장 포인트: 날짜 셀 스타일 커스터마이징
  onSelectEvent,
  onSelectSlot,
  date,
  onNavigate,
}) {
  // 기본 eventPropGetter: resource.color로 배경색 지정
  const defaultEventPropGetter = (event) => ({
    style: {
      backgroundColor: event.resource?.color ?? '#3B82F6',
      border: 'none',
      borderRadius: '6px',
      fontSize: '12px',
      fontWeight: 600,
    },
  })

  return (
    <div style={{ height: 600 }}>
      <Calendar
        localizer={localizer}
        events={events}
        defaultView="month"
        views={['month']}
        culture="ko"
        date={date}
        onNavigate={onNavigate}
        eventPropGetter={eventPropGetter ?? defaultEventPropGetter}
        dayPropGetter={dayPropGetter}
        onSelectEvent={onSelectEvent}
        onSelectSlot={onSelectSlot}
        selectable={!!onSelectSlot}
        messages={{
          next: '다음',
          previous: '이전',
          today: '오늘',
          month: '월',
          week: '주',
          day: '일',
          noEventsInRange: '이 기간에 일정이 없습니다.',
        }}
      />
    </div>
  )
}
